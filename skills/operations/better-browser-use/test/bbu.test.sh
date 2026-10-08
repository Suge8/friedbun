#!/usr/bin/env bash
# bbu 验收：真实浏览器跑在临时 agent-browser namespace 与临时 BBU_HOME 里，不碰用户的浏览器和登录态。
# 升级 agent-browser 或 CloakBrowser 后跑一遍：bash test/bbu.test.sh
set -uo pipefail

BBU="$(cd "$(dirname "$0")/.." && pwd)/bin/bbu"
T=$(mktemp -d)
export BBU_HOME="$T/home" AGENT_BROWSER_NAMESPACE="bbu-test-$$"
mkdir -p "$T/a" "$T/b" && git -C "$T/a" init -q && git -C "$T/b" init -q
node -e 'require("http").createServer((q,s)=>{s.setHeader("content-type","text/html");s.end("<title>"+q.url+"</title>ok")}).listen(0,"127.0.0.1",function(){console.log(this.address().port)})' > "$T/port" &
SERVER=$!
cleanup() {
  agent-browser close --all >/dev/null 2>&1
  kill "$SERVER" && wait "$SERVER" 2>/dev/null
  rm -rf "$T" "$HOME/.agent-browser/namespaces/$AGENT_BROWSER_NAMESPACE"
}
trap cleanup EXIT
until [ -s "$T/port" ]; do sleep 0.1; done
U="http://127.0.0.1:$(cat "$T/port")"

failed=0
check() { # check <名字> <实际> <期望子串>
  case "$2" in *"$3"*) echo "ok   $1" ;; *) echo "FAIL $1：期望含 $3，实际 $2"; failed=1 ;; esac
}
refute() { # refute <名字> <实际> <不应出现的子串>
  case "$2" in *"$3"*) echo "FAIL $1：不应含 $3，实际 $2"; failed=1 ;; *) echo "ok   $1" ;; esac
}
a() { (cd "$T/a" && "$BBU" "$@" 2>&1); }
b() { (cd "$T/b" && "$BBU" "$@" 2>&1); }

# 1 共享浏览器：两个检出从冷启动并发打开，各占一个可见窗口，登录实时共享
a --login open "$U/a" >/dev/null & first=$!
b --login open "$U/b" >/dev/null
wait "$first"
check "login: A 停在自己的页面" "$(a --login get url)" "$U/a"
check "login: B 停在自己的页面" "$(b --login get url)" "$U/b"
check "login: A 窗口可见" "$(a --login eval 'document.visibilityState')" visible
check "login: B 窗口可见" "$(b --login eval 'document.visibilityState')" visible
a --login eval 'document.cookie="who=a; max-age=600"' >/dev/null
check "login: A 的登录 B 立即可见" "$(b --login eval 'document.cookie')" "who=a"

# 2 关闭只关自己的窗口
a --login close >/dev/null
check "login: A 关闭后 B 不受影响" "$(b --login get url)" "$U/b"

# 3 共享浏览器整体关闭后，下一条命令自动恢复，登录态留在 profile 里
agent-browser close --all >/dev/null 2>&1
until [ "$(agent-browser session list)" = "No active sessions" ]; do sleep 0.1; done
b --login open "$U/b" >/dev/null
check "login: 重启后自动恢复到可见窗口" "$(b --login eval 'document.visibilityState')" visible
check "login: 重启后登录态仍在" "$(b --login eval 'document.cookie')" "who=a"

# 4 开发车道：按检出隔离，--as 再隔离，登录态跨重启保留
a open "$U/dev" >/dev/null
a eval 'document.cookie="dev=a; max-age=600"' >/dev/null
b open "$U/dev" >/dev/null
refute "dev: 检出之间不共享登录" "$(b eval 'document.cookie')" "dev=a"
a --as guest open "$U/dev" >/dev/null
refute "dev: --as 身份之间不共享登录" "$(a --as guest eval 'document.cookie')" "dev=a"
a close >/dev/null
a open "$U/dev" >/dev/null
check "dev: 登录态跨重启保留" "$(a eval 'document.cookie')" "dev=a"

exit $failed
