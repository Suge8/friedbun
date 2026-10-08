#!/usr/bin/env node
// 联网搜索入口：search 并行问各家官方搜索交证据，--quick 走 TinyFish 结果列表，fetch 取正文。
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const SEARCH_TIMEOUT_MS = 90_000;
const QUICK_COUNT = 8;
const FETCH_CHARS = 40000;
const FETCH_MAX_URLS = 10;
const MIN_QUOTE_CHARS = 12;
const MIN_QUOTE_PART = 8;
const PI_PACKAGE = "@earendil-works/pi-coding-agent";
const EVIDENCE_PROMPT = `You are a web evidence extractor for another AI agent. Search the web and read primary sources (official docs, source code, specs, first-party announcements) in preference to aggregators.
For each question, report evidence only: quote the key passages verbatim in double quotes, each followed by its source URL. Keep code and configuration snippets exactly as written.
When no source supports an answer, say so explicitly. No conclusions beyond the quotes.`;
// 订阅令牌的请求必须以 Claude Code 身份开头，否则接口以 429 拒绝，看起来像限流。
const CLAUDE_CODE_IDENTITY = "You are Claude Code, Anthropic's official CLI for Claude.";

const ENGINES = {
	anthropic: {
		label: "Anthropic",
		provider: "anthropic",
		model: "claude-sonnet-5",
		resetHeader: "anthropic-ratelimit-unified-reset",
		request: anthropicRequest,
		parse: anthropicParse,
	},
	openai: {
		label: "OpenAI",
		provider: "openai-codex",
		model: "gpt-6-luna",
		resetHeader: "x-codex-primary-reset-at",
		request: openaiRequest,
		parse: openaiParse,
	},
};

const HELP = `联网搜索与取正文

  web.mjs search "问题" ["问题"...]           并行问 Anthropic 与 OpenAI 官方搜索，返回带核实标记的证据（10–30 秒，占订阅用量）
  web.mjs search "query" ["query"...] --quick  TinyFish 结果列表（约 2 秒，免费）
  web.mjs fetch <url...>                       取正文转 Markdown，一次最多 ${FETCH_MAX_URLS} 个（免费）

每个参数是一个独立的问题或查询，多词加引号。

search 选项
  --only ${Object.keys(ENGINES).join("|")}   只问一家（默认问全部，未在 pi 登录的跳过并注明）
  --site DOMAIN     限定域名，逗号分隔或重复传入
  --not DOMAIN      排除域名；官方搜索不能与 --site 同用
  -n N              --quick 每个查询的结果条数，默认 ${QUICK_COUNT}

fetch 选项
  --chars N         每页正文字符上限，默认 ${FETCH_CHARS}，0 为不截断
  --links           一并输出页面内链接`;

function fail(message) {
	console.error(message);
	process.exit(1);
}

function parseArgs(argv) {
	const opts = { args: [], site: [], not: [], count: QUICK_COUNT, chars: FETCH_CHARS };
	const domains = (value) => String(value ?? "").split(",").filter(Boolean);
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--quick") opts.quick = true;
		else if (arg === "--only") opts.only = argv[++i];
		else if (arg === "--site") opts.site.push(...domains(argv[++i]));
		else if (arg === "--not") opts.not.push(...domains(argv[++i]));
		else if (arg === "-n") opts.count = Number(argv[++i]);
		else if (arg === "--chars") opts.chars = Number(argv[++i]);
		else if (arg === "--links") opts.links = true;
		else if (arg.startsWith("-")) fail(`未知选项 ${arg}\n\n${HELP}`);
		else opts.args.push(arg);
	}
	return opts;
}

// ---- 各家官方搜索：请求与解析 ----
// parse 统一产出 { text: 回复, known: 搜到的页面 {url,title,date}, cited: 引用网址, raw: 可供核实的原料 }。

function anthropicRequest(engine, key, prompt, opts) {
	const oauth = key.includes("sk-ant-oat");
	const auth = oauth ? { authorization: `Bearer ${key}`, "anthropic-beta": "oauth-2025-04-20" } : { "x-api-key": key };
	const system = [...(oauth ? [CLAUDE_CODE_IDENTITY] : []), EVIDENCE_PROMPT].map((text) => ({ type: "text", text }));
	const tool = {
		type: "web_search_20260318",
		name: "web_search",
		max_uses: 5,
		// 动态过滤在订阅令牌下多数请求一次也搜不出来，只用直接调用。
		allowed_callers: ["direct"],
		...(opts.site.length ? { allowed_domains: opts.site } : {}),
		...(opts.not.length ? { blocked_domains: opts.not } : {}),
	};
	return {
		url: "https://api.anthropic.com/v1/messages",
		headers: { "content-type": "application/json", "anthropic-version": "2023-06-01", ...auth },
		body: {
			model: engine.model,
			max_tokens: 16000,
			thinking: { type: "adaptive" },
			output_config: { effort: "medium" },
			system,
			tools: [tool],
			messages: [{ role: "user", content: prompt }],
		},
	};
}

// Anthropic 的搜索结果正文是加密的，可核实的原料只有引用自带的原文片段。
function anthropicParse(body) {
	const content = JSON.parse(body).content ?? [];
	const blocks = content.filter((b) => b.type === "web_search_tool_result");
	const results = blocks.flatMap((b) => (Array.isArray(b.content) ? b.content : []));
	const errors = blocks.map((b) => b.content?.error_code).filter(Boolean);
	if (!results.length && errors.length) throw new Error(`搜索失败 ${errors.join(", ")}`);
	const cites = content.flatMap((b) => b.citations ?? []);
	return {
		text: content.filter((b) => b.type === "text").map((b) => b.text).join(""),
		known: results.map((r) => ({ url: r.url, title: r.title, date: r.page_age })),
		cited: cites.map((c) => c.url),
		raw: [
			...results.map((r) => `- ${r.title} · ${r.page_age ?? ""}\n  ${r.url}`),
			...cites.map((c) => `> ${clean(c.cited_text)}\n  ${c.url}`),
		].join("\n"),
	};
}

function openaiRequest(engine, key, prompt, opts) {
	const filters = opts.site.length ? { allowed_domains: opts.site } : opts.not.length ? { blocked_domains: opts.not } : null;
	return {
		url: "https://chatgpt.com/backend-api/codex/responses",
		headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
		body: {
			model: engine.model,
			stream: true,
			store: false,
			instructions: EVIDENCE_PROMPT,
			reasoning: { effort: "medium" },
			tools: [{ type: "web_search", external_web_access: true, ...(filters ? { filters } : {}) }],
			include: ["web_search_call.results"],
			input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
		},
	};
}

function openaiParse(body) {
	const items = [];
	for (const line of body.split("\n")) {
		if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
		const event = JSON.parse(line.slice(6));
		if (event.type === "response.output_item.done") items.push(event.item);
		if (event.type === "response.failed" || event.type === "error") {
			throw new Error(event.response?.error?.message ?? event.message ?? JSON.stringify(event).slice(0, 200));
		}
	}
	const parts = items.filter((o) => o.type === "message").flatMap((o) => o.content);
	const calls = items.filter((o) => o.type === "web_search_call");
	const results = calls.flatMap((c) => c.results ?? []);
	const action = (c) => `## ${c.action?.type} ${c.action?.queries?.join(" | ") ?? c.action?.url ?? ""}`;
	return {
		text: parts.map((c) => c.text).join("").replace(/[?&]utm_source=openai/g, ""),
		known: results.map((r) => ({ url: r.url, title: r.title })),
		cited: parts.flatMap((c) => c.annotations ?? []).filter((a) => a.type === "url_citation").map((a) => a.url),
		raw: calls.map((c) => [action(c), ...(c.results ?? []).map((r) => `### ${r.title}\n${r.url}\n${r.snippet}`)].join("\n")).join("\n\n"),
	};
}

// ---- 凭据与调用：登录与令牌刷新全部交给 pi ----

function locatePi() {
	const bin = execFileSync("which", ["pi"], { encoding: "utf8" }).trim();
	// 开发版的 dist/ 里有一份同名 manifest 副本，以入口文件真实存在为准。
	for (let dir = dirname(realpathSync(bin)); dir !== dirname(dir); dir = dirname(dir)) {
		const manifest = join(dir, "package.json");
		if (!existsSync(manifest)) continue;
		const { name, exports } = JSON.parse(readFileSync(manifest, "utf8"));
		const entry = name === PI_PACKAGE && join(dir, exports["."].import);
		if (entry && existsSync(entry)) return entry;
	}
	throw new Error(`${bin} 不属于 ${PI_PACKAGE}`);
}

async function loadRuntime() {
	let entry;
	try {
		entry = locatePi();
	} catch (error) {
		fail(`官方搜索需要本机安装 pi 并登录（${error.message.trim()}）；可改用 --quick`);
	}
	const { ModelRuntime, getAgentDir } = await import(pathToFileURL(entry).href);
	const dir = getAgentDir();
	return ModelRuntime.create({ authPath: join(dir, "auth.json"), modelsPath: join(dir, "models.json"), refreshOnCreate: false });
}

function httpReason(engine, response, body) {
	if (response.status === 401 || response.status === 403) return `登录失效，在 pi 里重新 /login ${engine.provider}`;
	if (response.status !== 429) return `${response.status}: ${body.slice(0, 200).replace(/\s+/g, " ")}`;
	const reset = Number(response.headers.get(engine.resetHeader));
	const when = reset ? `，约 ${new Date(reset * 1000).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 重置` : "";
	return `额度用完或限流${when}`;
}

async function runEngine(engine, runtime, prompt, opts) {
	const model = runtime.getModel(engine.provider, engine.model);
	if (!model) return { error: `pi 模型目录里没有 ${engine.provider}/${engine.model}` };
	let auth;
	try {
		auth = await runtime.getAuth(model);
	} catch (error) {
		return { error: `登录失效（${error.message}），在 pi 里重新 /login ${engine.provider}` };
	}
	if (!auth) return { error: `未登录，在 pi 里 /login ${engine.provider}` };
	const started = Date.now();
	try {
		const { url, headers, body } = engine.request(engine, auth.auth.apiKey, prompt, opts);
		const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) });
		const text = await response.text();
		if (!response.ok) return { error: httpReason(engine, response, text) };
		return { ...engine.parse(text), ms: Date.now() - started };
	} catch (error) {
		return { error: error.name === "TimeoutError" ? `超时（${SEARCH_TIMEOUT_MS / 1000} 秒）` : error.message };
	}
}

// ---- 证据核实 ----

const ENTITIES = { "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&#x27;": "'", "&#39;": "'", "&nbsp;": " " };
const clean = (text) => String(text ?? "").replace(/<[^>]+>/g, "").replace(/&[#\w]+;/g, (e) => ENTITIES[e] ?? e).replace(/\s+/g, " ").trim();
const normText = (text) => clean(text).normalize("NFKC").toLowerCase().replace(/[*_`"'“”‘’「」\\]/g, "").replace(/\s+/g, " ");
const trimPunct = (text) => text.replace(/^[\s.,;:!?。，；：！？]+|[\s.,;:!?。，；：！？]+$/g, "");
const QUOTE = /“([^”]+)”|"([^"\n]+)"|「([^」]+)」|^>\s?(.+)$/gm;
const URL_IN_TEXT = /https?:\/\/[^\s)\]>"'`，。]+/g;

function normUrl(url) {
	try {
		const parsed = new URL(url.replace(/[.,;:]+$/, ""));
		parsed.hash = "";
		for (const key of [...parsed.searchParams.keys()]) if (key.startsWith("utm_")) parsed.searchParams.delete(key);
		return parsed.toString().replace(/\/$/, "");
	} catch {
		return url;
	}
}

const referencedUrls = (result) => [...new Set([...(result.text.match(URL_IN_TEXT) ?? []), ...result.cited].map(normUrl))];

// 引文按省略号切段，每段都能在原料里逐字找到才算核实。
function isVerbatim(quote, haystack) {
	const parts = quote.split(/\.{3}|…/).map((p) => trimPunct(normText(p))).filter((p) => p.length >= MIN_QUOTE_PART);
	return parts.length > 0 && parts.every((p) => haystack.includes(p));
}

// 代码块里的引号是代码本身，不参与核实。
function markQuotes(text, raw) {
	const haystack = normText(raw);
	let unverified = 0;
	const mark = (match, ...groups) => {
		const quote = groups.slice(0, 4).find(Boolean);
		if (!quote || quote.length < MIN_QUOTE_CHARS) return match;
		if (isVerbatim(quote, haystack)) return `${match} ✓`;
		unverified++;
		return `${match} ？`;
	};
	const marked = text.split(/(```[\s\S]*?```)/).map((part, i) => (i % 2 ? part : part.replace(QUOTE, mark))).join("");
	return { marked, unverified };
}

// 原料里找不到的引文，取它引用的原页正文再核一次；原页也进原料文件。
async function recheckPages(done) {
	const pending = done.filter(([, r]) => markQuotes(r.text, r.raw).unverified > 0);
	if (!pending.length) return { raw: "", note: "" };
	if (!process.env.TINYFISH_API_KEY) return { raw: "", note: "未回查原页：缺少 TINYFISH_API_KEY" };
	const urls = [...new Set(pending.flatMap(([, r]) => referencedUrls(r)))].slice(0, FETCH_MAX_URLS);
	if (!urls.length) return { raw: "", note: "" };
	try {
		const data = await tinyfishFetch(urls, false);
		const pages = (data.results ?? []).map((p) => `# ${p.title ?? p.url}\n${p.final_url ?? p.url}\n\n${p.text ?? ""}`);
		return { raw: pages.join("\n\n"), note: `回查原页 ${pages.length}/${urls.length}` };
	} catch (error) {
		return { raw: "", note: `回查原页失败：${error.message}` };
	}
}

// ---- 输出 ----

function sourceList(done) {
	const known = new Map(done.flatMap(([, r]) => r.known.map((k) => [normUrl(k.url), k])));
	const merged = new Map();
	for (const [name, result] of done) {
		for (const url of referencedUrls(result)) {
			const entry = merged.get(url) ?? { ...known.get(url), url, engines: new Set() };
			entry.engines.add(ENGINES[name].label);
			merged.set(url, entry);
		}
	}
	return [...merged.values()].map((s, i) => `${i + 1}. ${clean(s.title) || s.url}${s.date ? ` · ${s.date}` : ""} · ${[...s.engines].join("+")}\n   ${s.url}`);
}

function writeRaw(queries, done, pages) {
	const dir = join(tmpdir(), "web-search");
	mkdirSync(dir, { recursive: true });
	const path = join(dir, `${Date.now()}.md`);
	const sections = done.map(([name, r]) => `# ${ENGINES[name].label} 原料\n\n${r.raw}\n\n## ${ENGINES[name].label} 回复原文\n\n${r.text}`);
	writeFileSync(path, [`# 搜索：${queries.join(" ｜ ")}`, ...sections, pages.raw && `# 回查原页\n\n${pages.raw}`].filter(Boolean).join("\n\n"));
	return path;
}

function render(queries, outcomes, pages) {
	const done = outcomes.filter(([, r]) => !r.error);
	const status = outcomes.map(([name, r]) => `${ENGINES[name].label}${r.error ? `：${r.error}` : ` ${(r.ms / 1000).toFixed(1)}s`}`);
	const lines = [`# 搜索：${queries.join(" ｜ ")}`, status.join(" ｜ "), ""];
	for (const [name, r] of done) lines.push(`## ${ENGINES[name].label}`, markQuotes(r.text, `${r.raw}\n${pages.raw}`).marked.trim(), "");
	lines.push("## 来源", ...sourceList(done), "");
	lines.push(`✓ 引文逐字核实，？ 原料里找不到${pages.note ? `（${pages.note}）` : ""}。原料：${writeRaw(queries, done, pages)}`);
	return lines.join("\n");
}

async function runOfficial(opts) {
	if (opts.site.length && opts.not.length) fail("官方搜索不能同时用 --site 与 --not");
	if (opts.only && !(opts.only in ENGINES)) fail(`--only 只接受 ${Object.keys(ENGINES).join("|")}，收到 ${opts.only}`);
	const names = opts.only ? [opts.only] : Object.keys(ENGINES);
	const prompt = opts.args.length === 1 ? opts.args[0] : opts.args.map((q, i) => `${i + 1}. ${q}`).join("\n");
	const runtime = await loadRuntime();
	const outcomes = await Promise.all(names.map(async (name) => [name, await runEngine(ENGINES[name], runtime, prompt, opts)]));
	const done = outcomes.filter(([, r]) => !r.error);
	if (done.length) return console.log(render(opts.args, outcomes, await recheckPages(done)));
	const others = Object.keys(ENGINES).filter((name) => !names.includes(name)).map((name) => `--only ${name}`);
	fail([...outcomes.map(([name, r]) => `${ENGINES[name].label}：${r.error}`), `可改用 ${[...others, "--quick"].join(" 或 ")}`].join("\n"));
}

// ---- TinyFish ----

async function callTinyfish(url, init = {}) {
	const key = process.env.TINYFISH_API_KEY;
	if (!key) throw new Error("缺少 TINYFISH_API_KEY");
	const response = await fetch(url, { ...init, headers: { Accept: "application/json", "X-API-Key": key, ...init.headers } });
	const body = await response.text();
	if (!response.ok) throw new Error(`TinyFish ${response.status}: ${body.slice(0, 200).replace(/\s+/g, " ")}`);
	return JSON.parse(body);
}

const tinyfishFetch = (urls, links) =>
	callTinyfish("https://api.fetch.tinyfish.ai/", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ urls, format: "markdown", links }),
	});

async function runQuick(opts) {
	const search = (query) => {
		const params = new URLSearchParams({ query });
		if (opts.site.length) params.set("include_domains", opts.site.join(","));
		if (opts.not.length) params.set("exclude_domains", opts.not.join(","));
		return callTinyfish(`https://api.search.tinyfish.ai/?${params}`);
	};
	const pages = await Promise.all(opts.args.map(search));
	for (const [i, data] of pages.entries()) {
		console.log(`# ${opts.args[i]}\n`);
		const items = (data.results ?? []).slice(0, opts.count);
		if (!items.length) console.log("无结果\n");
		for (const [n, r] of items.entries()) console.log(`${n + 1}. ${clean(r.title)}\n   ${r.url}\n   ${clean(r.snippet)}\n`);
	}
}

async function runFetch(opts) {
	const urls = opts.args;
	if (!urls.length || !urls.every((arg) => /^https?:\/\//.test(arg))) fail(`fetch 只接受 http(s) URL\n\n${HELP}`);
	if (urls.length > FETCH_MAX_URLS) fail(`fetch 一次最多 ${FETCH_MAX_URLS} 个 URL，收到 ${urls.length}`);
	const data = await tinyfishFetch(urls, Boolean(opts.links));
	for (const result of data.results ?? []) {
		const text = result.text ?? "";
		const body = opts.chars > 0 && text.length > opts.chars
			? `${text.slice(0, opts.chars)}\n\n[已截断 ${text.length - opts.chars} 字符，需要全文加 --chars 0]`
			: text;
		console.log(`# ${result.title ?? result.url}\n${result.final_url ?? result.url}\n\n${body}\n`);
		if (opts.links && result.links?.length) console.log(`链接: ${result.links.slice(0, 40).join(" ")}\n`);
	}
	for (const error of data.errors ?? []) console.error(`取不到 ${error.url}: ${error.error ?? error.message ?? JSON.stringify(error)}`);
	if (!(data.results ?? []).length) process.exit(1);
}

async function runSearch(opts) {
	if (!opts.args.length) fail(`search 需要至少一个问题或查询\n\n${HELP}`);
	return opts.quick ? runQuick(opts) : runOfficial(opts);
}

const [verb, ...rest] = process.argv.slice(2);
if (!verb || verb === "-h" || verb === "--help") {
	console.log(HELP);
	process.exit(verb ? 0 : 1);
}
const VERBS = { search: runSearch, fetch: runFetch };
if (!(verb in VERBS)) fail(`未知命令 ${verb}\n\n${HELP}`);
await VERBS[verb](parseArgs(rest)).catch((error) => fail(error.message));
