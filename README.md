<p align="center"><img alt="friedbun — my AI coding setup" src="assets/hero-en.jpg" width="100%"></p>

<p align="center"><b>English</b> · <a href="README.zh-CN.md">中文</a></p>

25 skills, multi-agent orchestration with FireCode, and an agent that can use Mac apps. Get just the skills with one command, or send one link to your coding agent to install the whole setup.

```bash
npx skills add Suge8/friedbun
```

For everything, paste this to your coding agent:

```text
Clone https://github.com/Suge8/friedbun and set up this Mac by following its SETUP.md.
```

## In action

The agent splits a dinner bill in Calculator and writes it down in TextEdit, using [bcu](https://github.com/Suge8/better-computer-use). The orange arrow is the agent's cursor. The whole clip runs in the background, and the real mouse doesn't move.

<p align="center"><img alt="The agent's orange cursor works Calculator and TextEdit" src="assets/bcu-demo.gif" width="100%"></p>

With [FireCode](https://github.com/Suge8/firecode), one agent hands work to several sub-agents running in parallel, each on its own model.

<p align="center"><img alt="FireCode sending work to three sub-agents" src="https://raw.githubusercontent.com/Suge8/firecode/main/design/promo/hero.gif" width="100%"></p>

## What's inside

- **workflow**: research a question from primary sources, poke holes in a plan, build a change test-first, review a session afterwards.
- **development**: tests, prototypes, architecture checks, sub-agent research, PR descriptions, releases.
- **frontend**: a UI taste guide and a component picker.
- **creative**: images, promo graphics and demo GIFs, product copy, social posts, video.
- **operations**: use Mac apps (bcu) and the browser (better-browser-use), drive Herdr terminal panes, work on servers over SSH.
- **web-search**: search the web and pull page text.

Each skill is a folder under [`skills/`](skills). `workflow` started as a fork of [mattpocock/skills](https://github.com/mattpocock/skills).

<details>
<summary>What the full setup installs</summary>

- [Pi](https://pi.dev) coding agent with FireCode, my settings, keybindings and model roles, and my system prompt (`SYSTEM.md`). The prompt changes the agent's tone and habits, so your agent mentions it first and you can skip it.
- Terminal: [Herdr](https://herdr.dev), [Ghostty](https://ghostty.org), [Starship](https://starship.rs), fastfetch and a zsh snippet.
- bcu for Mac apps; [agent-browser](https://github.com/vercel-labs/agent-browser) and [CloakBrowser](https://cloakbrowser.dev) for the web, in a separate browser from the one you use.
- The skills, linked to `~/.agents/skills`.

Files you already have get a `.bak` copy before they change. The agent stops when it needs you: to log in, grant macOS permissions, or paste an API key. [SETUP.md](SETUP.md) lists every file it touches.

</details>

Apple Silicon, macOS 14+ · [MIT](LICENSE) · by Fried Bun ([@Suge_dif](https://x.com/Suge_dif))
