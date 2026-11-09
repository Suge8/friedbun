#!/usr/bin/env node
// bbu 直接做的事，agent-browser 与 browse 没有对应命令：
//   window <ws> [targetId]   --stealth：targetId 的标签还在就打印它，否则在默认存储空间后台开一个新窗口、
//                            打印其 targetId（为什么要新窗口见 bbu）。
//   mine <账户> <会话前缀> [身份]
//                            --mine：确保默认浏览器的这个账户连着 browse（离线就开它的一个窗口、
//                            前台还给原应用），建或复用它的 browse 会话，打印会话 id。不带账户时列出账户，
//                            账户名后附 ~/.config/bbu.json 的 {"accounts": {账户: 用途}} 里写的用途。
//   import <ws> [--from <浏览器>] [--account <账户>] <域名>...
//                            从用户日常浏览器复制这些站点的 cookie。只复制 cookie：轮换制续期
//                            凭证多存在 localStorage，复制它会让两个浏览器互相作废登录。
import { execFile, execFileSync, spawn } from 'node:child_process';
import { createDecipheriv, createHash, pbkdf2Sync } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { promisify } from 'node:util';

const fail = (message) => { console.error('bbu: ' + message); process.exit(1); };
const run = promisify(execFile);

function connect(ws) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(ws);
    const pending = new Map();
    let id = 0;
    socket.onopen = () => resolve({
      send: (method, params) => new Promise((ok, ko) => {
        pending.set(++id, { ok, ko });
        socket.send(JSON.stringify({ id, method, params }));
      }),
      close: () => socket.close(),
    });
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      const call = pending.get(message.id);
      if (!call) return;
      pending.delete(message.id);
      message.error ? call.ko(new Error(message.error.message)) : call.ok(message.result);
    };
    socket.onerror = () => reject(new Error('cannot reach the browser at ' + ws));
  });
}

async function window(ws, target) {
  const browser = await connect(ws);
  try {
    const { targetInfos } = await browser.send('Target.getTargets');
    if (target && targetInfos.some((t) => t.targetId === target)) return target;
    // background：否则浏览器会被激活、抢走用户的前台。
    return (await browser.send('Target.createTarget', { url: 'about:blank', newWindow: true, background: true })).targetId;
  } finally {
    browser.close();
  }
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

// 账户即浏览器的 profile：名字是用户在浏览器里看到的，目录在 Local State 的 info_cache 里。
function profiles(name) {
  const browser = BROWSERS[name] ?? fail('unknown browser ' + name + '; supported: ' + SUPPORTED);
  const root = join(homedir(), 'Library/Application Support', browser.dir);
  if (!existsSync(root)) fail(name + ' has no data at ' + root);
  const { info_cache = {}, last_used = 'Default' } = JSON.parse(readFileSync(join(root, 'Local State'), 'utf8')).profile ?? {};
  const named = Object.entries(info_cache).map(([dir, info]) => ({ dir, name: info.name }));
  return { browser, root, named, lastUsed: last_used };
}
const findProfile = (named, account) => named.find((p) => p.name.toLowerCase() === account.toLowerCase());

function readCookies(name, account, domains) {
  const { browser, root, named, lastUsed } = profiles(name);
  const profile = account
    ? findProfile(named, account)?.dir ?? fail(name + ' has no account ' + account + '; accounts: ' + named.map((p) => p.name).join(', '))
    : lastUsed;
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

// open -g 给浏览器开账户窗口时浏览器仍会把自己推到前台（实测，-g 拦不住）：
// 订阅应用激活事件，bundle 的应用一激活就把前台还给 front 进程。就绪时打印一行。
const GUARD = `ObjC.import('AppKit');
function run([bundle, front]) {
  const previous = $.NSRunningApplication.runningApplicationWithProcessIdentifier(Number(front));
  $.NSWorkspace.sharedWorkspace.notificationCenter.addObserverForNameObjectQueueUsingBlock(
    $.NSWorkspaceDidActivateApplicationNotification, $(), $.NSOperationQueue.mainQueue, (note) => {
      if (note.userInfo.objectForKey($.NSWorkspaceApplicationKey).bundleIdentifier.js.toLowerCase() === bundle) previous.activateWithOptions(0);
    });
  console.log('ready');
  $.NSRunLoop.currentRunLoop.run;
}`;
async function guard(bundle) {
  const { stdout } = await run('lsappinfo', ['info', (await run('lsappinfo', ['front'])).stdout.trim()]);
  const child = spawn('osascript', ['-l', 'JavaScript', '-e', GUARD, bundle, stdout.match(/pid = (\d+)/)[1]], { stdio: ['ignore', 'ignore', 'pipe'] });
  process.on('exit', () => child.kill());
  await new Promise((resolve, reject) => {
    child.stderr.once('data', resolve);
    child.once('exit', () => reject(new Error('front-app guard exited')));
  });
  return () => child.kill();
}

// 账户开着窗口时扩展约 4 s 内连上 browse；中继刚启动时扩展要先重连。
const ONLINE_TIMEOUT_MS = 30000;
const browse = async (...args) => (await run('browse', args)).stdout;
const status = async () => JSON.parse(await browse('status', '--json'));
const online = (state, account) => state.extension?.browsers?.find((b) => b.connected && b.name.toLowerCase() === account.toLowerCase());
async function waitOnline(account, ms) {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 250))) {
    const state = await status();
    if (online(state, account)) return state;
  }
}

// browse CLI 不能选账户（session new 没有 browser 参数），中继的 /cli/session/new 能；会话 id 只许小写字母、
// 数字和 '-'，所以账户名取哈希。会话建在哪个账户就一直在那，账户名进 id 才不会把两个账户混进同一会话。
async function mine(account, prefix, as) {
  const name = defaultBrowser();
  const { browser, named } = profiles(name);
  let state = await status();
  const list = () => {
    const file = join(homedir(), '.config/bbu.json');
    let purposes = {};
    if (existsSync(file)) {
      try { purposes = JSON.parse(readFileSync(file, 'utf8')).accounts ?? {}; } catch (e) { fail(file + ': ' + e.message); }
    }
    const label = (n) => purposes[n] ? n + '（' + purposes[n] + '）' : n;
    const up = (state.extension?.browsers ?? []).filter((b) => b.connected).map((b) => b.name);
    const down = named.map((p) => p.name).filter((n) => !up.some((u) => u.toLowerCase() === n.toLowerCase()));
    return 'online: ' + (up.map(label).join(', ') || 'none') + '; offline ' + name + ' accounts: ' + (down.map(label).join(', ') || 'none');
  };
  if (!account) fail('usage: bbu --mine <account> <browse command>...; ' + list());
  if (!state.relay.running) {
    // 任一操作类命令都会拉起中继；中继进程会继承管道，所以不接它的输出。
    await new Promise((resolve) => spawn('browse', ['session', 'list'], { stdio: 'ignore' }).once('exit', resolve));
    state = (await waitOnline(account, 5000)) ?? await status();
  }
  if (!online(state, account)) {
    const profile = findProfile(named, account) ?? fail('no account named ' + account + '; ' + list());
    const stop = await guard(browser.bundle);
    await run('open', ['-g', '-n', '-b', browser.bundle, '--args', '--profile-directory=' + profile.dir, 'about:blank']);
    state = await waitOnline(account, ONLINE_TIMEOUT_MS)
      ?? fail(account + ' opened but did not connect to browse; is the browse extension added and paired in it? ' + list());
    // 窗口出现与扩展上线先后不定，多守一会儿再撤。
    await new Promise((r) => setTimeout(r, 500));
    stop();
  }
  const id = [prefix, createHash('sha256').update(account.toLowerCase()).digest('hex').slice(0, 8), ...(as ? [as.toLowerCase().replaceAll('_', '-')] : [])].join('-');
  const token = readFileSync(join(process.env.XDG_DATA_HOME || join(homedir(), '.local/share'), 'browse/relay-token'), 'utf8').trim();
  const response = await fetch(state.endpoint + '/cli/session/new', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ id, browser: online(state, account).name }),
  });
  const body = await response.json();
  if (!response.ok && body.code !== 'session-already-exists') fail(body.error);
  return id;
}

const [command, ...args] = process.argv.slice(2);
try {
  if (command === 'window') {
    console.log(await window(args[0], args[1]));
  } else if (command === 'mine') {
    console.log(await mine(...args));
  } else if (command === 'import') {
    const [ws, ...rest] = args;
    if (process.platform !== 'darwin') fail('import supports macOS only');
    const options = {};
    while (rest[0] === '--from' || rest[0] === '--account') options[rest.shift().slice(2)] = rest.shift();
    const { from = defaultBrowser(), account } = options;
    const domains = rest.map((d) => d.replace(/^https?:\/\//, '').replace(/^\.|[/:].*$/g, '').toLowerCase());
    if (!domains.length) fail('usage: bbu import [--from <' + SUPPORTED + '>] [--account <account>] <domain>...');
    const cookies = await readCookies(from, account, domains);
    if (!cookies.length) fail(from + (account ? ' account ' + account : '') + ' has no cookies for ' + domains.join(' '));
    const browser = await connect(ws);
    await browser.send('Storage.setCookies', { cookies });
    browser.close();
    console.log('imported ' + cookies.length + ' cookies for ' + domains.join(' ') + ' from ' + from + (account ? ' account ' + account : ''));
  } else {
    fail('unknown command ' + command);
  }
} catch (error) {
  fail(error.message);
}
