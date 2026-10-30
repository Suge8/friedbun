#!/usr/bin/env node
// 联网搜索入口：search 经 magpie 使用各家搜索，--quick 与 fetch 使用 TinyFish。
import { mkdirSync, writeFileSync } from "node:fs";
import { setGlobalProxyFromEnv } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SEARCH_TIMEOUT_MS = 90_000;
const CATALOG_TIMEOUT_MS = 10_000;
const MAGPIE_BASE_URL = (process.env.MAGPIE_BASE_URL || "http://127.0.0.1:3425").replace(/\/+$/, "");
const MAGPIE_API_KEY = process.env.MAGPIE_API_KEY || "magpie";
setGlobalProxyFromEnv({ ...process.env, NO_PROXY: [process.env.NO_PROXY, "localhost", "127.0.0.1", "::1"].filter(Boolean).join(",") });
const QUICK_COUNT = 8;
const FETCH_CHARS = 40000;
const FETCH_MAX_URLS = 10;
const MIN_QUOTE_CHARS = 12;
const MIN_QUOTE_PART = 8;
const EVIDENCE_PROMPT = `You are a web evidence extractor for another AI agent. Search the web and read primary sources (official docs, source code, specs, first-party announcements) in preference to aggregators.
For each question, report evidence only: quote the key passages verbatim in double quotes, each followed by its source URL. Keep code and configuration snippets exactly as written.
When no source supports an answer, say so explicitly. No conclusions beyond the quotes.`;
const ENGINES = {
	anthropic: {
		label: "Anthropic",
		model: "claude/claude-sonnet-5-5",
		resetHeader: "anthropic-ratelimit-unified-reset",
		request: anthropicRequest,
		parse: anthropicParse,
	},
	openai: {
		label: "OpenAI",
		model: "codex/gpt-6-luna",
		resetHeader: "x-codex-primary-reset-at",
		request: openaiRequest,
		parse: openaiParse,
	},
};

const HELP = `联网搜索与取正文

  web.mjs search "问题" ["问题"...]           经 magpie 并行问 Claude 与 Codex 搜索，返回带核实标记的证据（占订阅用量）
  web.mjs search "query" ["query"...] --quick  TinyFish 结果列表
  web.mjs fetch <url...>                       取正文转 Markdown，一次最多 ${FETCH_MAX_URLS} 个

每个参数是一个独立的问题或查询，多词加引号。

search 选项
  --only ${Object.keys(ENGINES).join("|")}   只问一家（默认问全部，magpie 未提供的模型跳过并注明）
  --site DOMAIN     限定域名，逗号分隔或重复传入
  --not DOMAIN      排除域名；官方搜索不能与 --site 同用
  -n N              --quick 每个查询的结果条数，默认 ${QUICK_COUNT}

fetch 选项
  --chars N         每页正文字符上限，默认 ${FETCH_CHARS}，0 为不截断
  --links           一并输出页面内链接

search 只连接 magpie，不读取或刷新 Pi、Claude、Codex 的登录。
MAGPIE_BASE_URL 覆盖网关地址（默认 http://127.0.0.1:3425）；MAGPIE_API_KEY 覆盖网关密钥（默认 magpie）。
--quick 与 fetch 需要 TINYFISH_API_KEY。`;

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

function anthropicRequest(engine, prompt, opts) {
	const system = [{ type: "text", text: EVIDENCE_PROMPT }];
	const domains = opts.site.length ? `Only cite sources from these domains or their subdomains: ${opts.site.join(", ")}.` : opts.not.length ? `Do not cite these domains or their subdomains: ${opts.not.join(", ")}.` : "";
	const tool = {
		type: "web_search_20260318",
		name: "web_search",
		max_uses: 5,
		allowed_callers: ["direct"],
		...(opts.site.length ? { allowed_domains: opts.site } : {}),
		...(opts.not.length ? { blocked_domains: opts.not } : {}),
	};
	return {
		url: `${MAGPIE_BASE_URL}/v1/messages`,
		headers: { "anthropic-version": "2023-06-01" },
		body: {
			model: engine.model,
			max_tokens: 16000,
			thinking: { type: "adaptive" },
			output_config: { effort: "medium" },
			system,
			tools: [tool],
			messages: [{ role: "user", content: [domains, prompt].filter(Boolean).join("\n\n") }],
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
	if (!blocks.length) throw new Error("magpie 未返回 Claude 联网搜索事件，不能把普通回答当成搜索结果");
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

function openaiRequest(engine, prompt, opts) {
	const filters = opts.site.length ? { allowed_domains: opts.site } : opts.not.length ? { blocked_domains: opts.not } : null;
	return {
		url: `${MAGPIE_BASE_URL}/v1/responses`,
		headers: {},
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
	let completed = false;
	for (const line of body.split("\n")) {
		if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
		const event = JSON.parse(line.slice(6));
		if (event.type === "response.completed") completed = true;
		if (event.type === "response.output_item.done") items.push(event.item);
		if (event.type === "response.failed" || event.type === "error") {
			throw new Error(event.response?.error?.message ?? event.message ?? JSON.stringify(event).slice(0, 200));
		}
	}
	if (!completed) throw new Error("magpie 的搜索响应流未完成");
	const parts = items.filter((o) => o.type === "message").flatMap((o) => o.content);
	const calls = items.filter((o) => o.type === "web_search_call");
	if (!calls.length) throw new Error("magpie 未返回 OpenAI 联网搜索事件，不能把普通回答当成搜索结果");
	const results = calls.flatMap((c) => c.results ?? []);
	const action = (c) => `## ${c.action?.type} ${c.action?.queries?.join(" | ") ?? c.action?.url ?? ""}`;
	return {
		text: parts.map((c) => c.text).join("").replace(/[?&]utm_source=openai/g, ""),
		known: results.map((r) => ({ url: r.url, title: r.title })),
		cited: parts.flatMap((c) => c.annotations ?? []).filter((a) => a.type === "url_citation").map((a) => a.url),
		raw: calls.map((c) => [action(c), ...(c.results ?? []).map((r) => `### ${r.title}\n${r.url}\n${r.snippet}`)].join("\n")).join("\n\n"),
	};
}

// ---- 网关调用：账号、凭据与刷新只由 magpie 管理 ----

async function loadCatalog() {
	let response;
	try {
		response = await fetch(`${MAGPIE_BASE_URL}/v1/models`, {
			headers: { authorization: `Bearer ${MAGPIE_API_KEY}` },
			signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
		});
	} catch (error) {
		throw new Error(`无法连接 magpie 网关 ${MAGPIE_BASE_URL}：${error.message}`);
	}
	if (!response.ok) throw new Error(`magpie 模型列表请求失败：HTTP ${response.status}`);
	const { data } = await response.json();
	return new Set(data.map((model) => model.id));
}

function httpReason(engine, response, body) {
	if (response.status === 401 || response.status === 403) return `magpie 中的 ${engine.label} 登录或权限不可用：${body.slice(0, 200).replace(/\s+/g, " ")}`;
	if (response.status !== 429) return `${response.status}: ${body.slice(0, 200).replace(/\s+/g, " ")}`;
	const reset = Number(response.headers.get(engine.resetHeader));
	const when = reset ? `，约 ${new Date(reset * 1000).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 重置` : "";
	return `额度用完或限流${when}`;
}

async function runEngine(engine, catalog, prompt, opts) {
	if (!catalog.has(engine.model)) return { error: `magpie 未提供 ${engine.model}；请在 magpie 登录并启用该模型` };
	const started = Date.now();
	try {
		const { url, headers, body } = engine.request(engine, prompt, opts);
		const response = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json", authorization: `Bearer ${MAGPIE_API_KEY}`, ...headers },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
		});
		const text = await response.text();
		if (!response.ok) return { error: httpReason(engine, response, text) };
		const result = engine.parse(text);
		const outside = referencedUrls(result).filter((url) => !matchesDomains(url, opts));
		if (outside.length) throw new Error(`搜索引用违反域名限制：${outside.join(", ")}`);
		return { ...result, ms: Date.now() - started };
	} catch (error) {
		return { error: error.name === "TimeoutError" ? `超时（${SEARCH_TIMEOUT_MS / 1000} 秒）` : error.message };
	}
}

function matchesDomains(url, opts) {
	const host = new URL(url).hostname.toLowerCase();
	const matches = (domain) => host === domain.toLowerCase() || host.endsWith(`.${domain.toLowerCase()}`);
	return (!opts.site.length || opts.site.some(matches)) && !opts.not.some(matches);
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
	const path = join(dir, `${Date.now()}-${process.pid}.md`);
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
	const catalog = await loadCatalog();
	const outcomes = await Promise.all(names.map(async (name) => [name, await runEngine(ENGINES[name], catalog, prompt, opts)]));
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
