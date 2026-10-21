#!/usr/bin/env node
// bbu 在窗口车道（--login、--mine）直接做的事，agent-browser 没有对应命令：
//   window <ws> [targetId]   targetId 的标签还在就打印它，否则在默认存储空间后台开一个新窗口、打印其 targetId
//                            （为什么要新窗口见 bbu）。
//   approve <pid> <命令>...  运行命令；它连接浏览器 pid 时弹出的「允许远程调试」对话框由 bcu 在后台按下允许。
//   import <ws> [--from <浏览器>] <域名>...
//                            从用户日常浏览器复制这些站点的 cookie。只复制 cookie：轮换制续期
//                            凭证多存在 localStorage，复制它会让两个浏览器互相作废登录。
import { execFile, execFileSync, spawn } from 'node:child_process';
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';
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

// 对话框在连接发起后不到 1 s 出现；这么久还没出现说明连接没走到审批，不再等。
const PROMPT_TIMEOUT_MS = '10000';
const bcu = async (args, options) => JSON.parse((await run('bcu', [...args, '--json'], options)).stdout);
const frontPid = async () => {
  const { stdout } = await run('lsappinfo', ['info', (await run('lsappinfo', ['front'])).stdout.trim()]);
  return Number(stdout.match(/pid = (\d+)/)[1]);
};
// 浏览器弹对话框前必定激活自己的窗口（Chromium DevToolsConnectionDialog 构造时调 Activate()，外部拦不住）：
// 订阅应用激活事件，浏览器一激活就把前台还给 argv[1]。
// 就绪时打印系统双击间隔（秒）。
const GUARD = `ObjC.import('AppKit');
function run([browser, front]) {
  const previous = $.NSRunningApplication.runningApplicationWithProcessIdentifier(Number(front));
  $.NSWorkspace.sharedWorkspace.notificationCenter.addObserverForNameObjectQueueUsingBlock(
    $.NSWorkspaceDidActivateApplicationNotification, $(), $.NSOperationQueue.mainQueue, (note) => {
      if (note.userInfo.objectForKey($.NSWorkspaceApplicationKey).processIdentifier === Number(browser)) previous.activateWithOptions(0);
    });
  console.log($.NSEvent.doubleClickInterval);
  $.NSRunLoop.currentRunLoop.run;
}`;
function guard(browser, front) {
  const child = spawn('osascript', ['-l', 'JavaScript', '-e', GUARD, browser, String(front)], { stdio: ['ignore', 'ignore', 'pipe'] });
  return new Promise((resolve, reject) => {
    child.stderr.once('data', (line) => resolve({ interval: Number(line), stop: () => child.kill() }));
    child.once('exit', () => reject(new Error('front-app guard exited')));
  });
}

// Chromium 144 起每个 CDP 连接都要用户在对话框里允许。只按自己这次连接的对话框：调用方持全机锁，
// 连接前浏览器已有对话框就拒绝，之后出现的只能是这次连接的。按钮按位置认，不按文字（界面语言各异）：
// macOS 上 Chromium 对话框的按钮从左到右是 [附加按钮] 取消 允许，允许在最后。
async function approve(pid, command) {
  const [{ roots }, front] = await Promise.all([bcu(['find-roots', '--pid', pid, '--kind', 'sheet']), frontPid()]);
  if (roots.length) fail('the browser is showing a dialog; dismiss it and retry');
  const { interval, stop } = await guard(pid, front);
  process.on('exit', stop);
  const child = spawn(command[0], command.slice(1), { stdio: 'inherit' });
  const exited = new Promise((resolve) => child.on('exit', (code) => resolve({ code: code ?? 1 })));
  const abort = new AbortController();
  const prompted = bcu(['wait-for', '--pid', pid, '--role', 'sheet', '--timeout', PROMPT_TIMEOUT_MS], { signal: abort.signal })
    .then((state) => ({ state }), (error) => ({ error }));
  const first = await Promise.race([exited, prompted]);
  if (first.code !== undefined) {
    abort.abort();
    return first.code;
  }
  try {
    if (first.error) throw first.error;
    const shown = Date.now();
    const { stateId } = first.state;
    const sheet = (await bcu(['search-ui', '--state', stateId, '--role', 'sheet'])).matches[0].ref;
    const dialog = await bcu(['expand-ui', '--state', stateId, '--ref', sheet]);
    const allow = dialog.nodes.filter((node) => node.role === 'button').at(-1).ref;
    // 对话框显示后一个双击间隔内的按键被当作误触忽略（Chromium 的 InputEventActivationProtector）。
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, interval * 1000 - (Date.now() - shown))));
    // 连接一建立命令就会结束，不必等 bcu 确认对话框已关；bcu 先失败才说明没按成。
    const pressed = run('bcu', ['act-ui', '--headless', '--state', dialog.stateId, JSON.stringify([{ action: 'press', ref: allow }]),
      '--expect-role', 'sheet', '--expect-gone', '--timeout', '2000'], { signal: abort.signal });
    const done = await Promise.race([exited, pressed.then(() => exited, (error) => ({ error }))]);
    if (done.error) throw done.error;
    abort.abort();
    return done.code;
  } catch (error) {
    child.kill();
    fail('could not approve remote debugging: ' + (error.stderr || error.message).trim());
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

const [command, ...args] = process.argv.slice(2);
try {
  if (command === 'window') {
    console.log(await window(args[0], args[1]));
  } else if (command === 'approve') {
    process.exit(await approve(args[0], args.slice(1)));
  } else if (command === 'import') {
    const [ws, ...rest] = args;
    if (process.platform !== 'darwin') fail('import supports macOS only');
    const from = rest[0] === '--from' ? rest.splice(0, 2)[1] : defaultBrowser();
    const domains = rest.map((d) => d.replace(/^https?:\/\//, '').replace(/^\.|[/:].*$/g, '').toLowerCase());
    if (!domains.length) fail('usage: bbu import [--from <' + SUPPORTED + '>] <domain>...');
    const cookies = await readCookies(from, domains);
    if (!cookies.length) fail(from + ' has no cookies for ' + domains.join(' '));
    const browser = await connect(ws);
    await browser.send('Storage.setCookies', { cookies });
    browser.close();
    console.log('imported ' + cookies.length + ' cookies for ' + domains.join(' ') + ' from ' + from);
  } else {
    fail('unknown command ' + command);
  }
} catch (error) {
  fail(error.message);
}
