#!/usr/bin/env node
// bbu 直接对共享浏览器（--login）做的两件事，agent-browser 没有对应命令：
//   window <ws>              在默认存储空间开一个新窗口，打印 targetId（为什么见 bbu）。
//   import <ws> [--from <浏览器>] <域名>...
//                            从用户日常浏览器复制这些站点的 cookie。只复制 cookie：轮换制续期
//                            凭证多存在 localStorage，复制它会让两个浏览器互相作废登录。
import { execFileSync } from 'node:child_process';
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';

const fail = (message) => { console.error('bbu: ' + message); process.exit(1); };

function cdp(ws, method, params) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(ws);
    socket.onopen = () => socket.send(JSON.stringify({ id: 1, method, params }));
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id !== 1) return;
      socket.close();
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    };
    socket.onerror = () => reject(new Error('cannot reach the shared browser at ' + ws));
  });
}

// macOS 上 Chromium 系浏览器的数据目录（~/Library/Application Support 下）与钥匙串里的 cookie 密钥项。
const BROWSERS = {
  chrome: { bundle: 'com.google.chrome', dir: 'Google/Chrome', key: 'Chrome Safe Storage' },
  helium: { bundle: 'net.imput.helium', dir: 'net.imput.helium', key: 'Helium Storage Key' },
  edge: { bundle: 'com.microsoft.edgemac', dir: 'Microsoft Edge', key: 'Microsoft Edge Safe Storage' },
  brave: { bundle: 'com.brave.browser', dir: 'BraveSoftware/Brave-Browser', key: 'Brave Safe Storage' },
  vivaldi: { bundle: 'com.vivaldi.vivaldi', dir: 'Vivaldi', key: 'Vivaldi Safe Storage' },
  chromium: { bundle: 'org.chromium.chromium', dir: 'Chromium', key: 'Chromium Safe Storage' },
};
const SUPPORTED = Object.keys(BROWSERS).join(', ');
const SAME_SITE = { 0: 'None', 1: 'Lax', 2: 'Strict' };
const WINDOWS_EPOCH_OFFSET = 11644473600n;

function defaultBrowser() {
  const plist = join(homedir(), 'Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist');
  const handlers = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', plist], { encoding: 'utf8' })).LSHandlers;
  const bundle = handlers.find((h) => h.LSHandlerURLScheme === 'https')?.LSHandlerRoleAll?.toLowerCase();
  const name = Object.keys(BROWSERS).find((n) => BROWSERS[n].bundle === bundle);
  return name ?? fail('default browser ' + (bundle ?? 'unknown') + ' is not supported; pass --from <' + SUPPORTED + '>');
}

function readCookies(name, domains) {
  const browser = BROWSERS[name] ?? fail('unknown browser ' + name + '; supported: ' + SUPPORTED);
  const root = join(homedir(), 'Library/Application Support', browser.dir);
  if (!existsSync(root)) fail(name + ' has no data at ' + root);
  const profile = JSON.parse(readFileSync(join(root, 'Local State'), 'utf8')).profile?.last_used ?? 'Default';
  const source = [join(root, profile, 'Network/Cookies'), join(root, profile, 'Cookies')].find(existsSync)
    ?? fail(name + ' profile ' + profile + ' has no cookie store');
  const password = execFileSync('security', ['find-generic-password', '-w', '-s', browser.key], { encoding: 'utf8' }).trim();
  const key = pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1');

  // 浏览器开着时库被锁，用 SQLite 在线备份读一份快照。
  const dir = mkdtempSync(join(tmpdir(), 'bbu-import-'));
  return backup(new DatabaseSync(source, { readOnly: true }), join(dir, 'Cookies')).then(() => {
    const db = new DatabaseSync(join(dir, 'Cookies'));
    // 库版本 24 起明文前 32 字节是 host 的 SHA-256。
    const version = Number(db.prepare("SELECT value FROM meta WHERE key = 'version'").get().value);
    const rows = db.prepare('SELECT host_key, name, value, encrypted_value, path, expires_utc, has_expires, is_secure, is_httponly, samesite, top_frame_site_key FROM cookies');
    rows.setReadBigInts(true);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const cookies = [];
    for (const row of rows.all()) {
      const host = row.host_key.replace(/^\./, '');
      const applies = domains.some((d) => host === d || d.endsWith('.' + host) || host.endsWith('.' + d));
      const expires = row.expires_utc / 1000000n - WINDOWS_EPOCH_OFFSET;
      if (!applies || row.top_frame_site_key || (row.has_expires && expires < now)) continue;
      let value = row.value;
      if (row.encrypted_value.length) {
        const decipher = createDecipheriv('aes-128-cbc', key, Buffer.alloc(16, ' '));
        const plain = Buffer.concat([decipher.update(row.encrypted_value.subarray(3)), decipher.final()]);
        value = (version >= 24 ? plain.subarray(32) : plain).toString('utf8');
      }
      const secure = Boolean(row.is_secure);
      cookies.push({
        name: row.name, value, path: row.path, secure, httpOnly: Boolean(row.is_httponly),
        sameSite: SAME_SITE[Number(row.samesite)],
        ...(row.has_expires ? { expires: Number(expires) } : {}),
        // 带点的是域 cookie；不带点的是仅限本主机的 cookie，只能用 url 设置（__Host- 前缀要求不带 Domain）。
        ...(row.host_key.startsWith('.') ? { domain: row.host_key } : { url: (secure ? 'https://' : 'http://') + host + row.path }),
      });
    }
    db.close();
    rmSync(dir, { recursive: true });
    return cookies;
  });
}

const [command, ws, ...rest] = process.argv.slice(2);
try {
  if (command === 'window') {
    console.log((await cdp(ws, 'Target.createTarget', { url: 'about:blank', newWindow: true })).targetId);
  } else if (command === 'import') {
    if (process.platform !== 'darwin') fail('import supports macOS only');
    const from = rest[0] === '--from' ? rest.splice(0, 2)[1] : defaultBrowser();
    const domains = rest.map((d) => d.replace(/^https?:\/\//, '').replace(/^\.|[/:].*$/g, '').toLowerCase());
    if (!domains.length) fail('usage: bbu import [--from <' + SUPPORTED + '>] <domain>...');
    const cookies = await readCookies(from, domains);
    if (!cookies.length) fail(from + ' has no cookies for ' + domains.join(' '));
    await cdp(ws, 'Storage.setCookies', { cookies });
    console.log('imported ' + cookies.length + ' cookies for ' + domains.join(' ') + ' from ' + from);
  } else {
    fail('unknown command ' + command);
  }
} catch (error) {
  fail(error.message);
}
