<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/hero-en-dark.jpg">
    <img alt="friedbun — send this repo to your agent, get my whole setup" src="assets/hero-en-light.jpg" width="100%">
  </picture>
</p>

<p align="center"><b>English</b> · <a href="README.zh-CN.md">中文</a></p>

My whole coding-agent workstation — 25 agent skills, the config files I actually run, and the tools behind them — packaged so your agent can install it on your Mac.

**Just the skills:**

```bash
npx skills add Suge8/friedbun
```

**The whole workstation** — paste this to your coding agent:

```text
Clone https://github.com/Suge8/friedbun and set up this Mac by following its SETUP.md.
```

Your agent installs everything, merges into the configs you already have (any file it changes gets a `.bak` copy first), and stops only for the steps that need you: logging in, granting macOS permissions, pasting an API key.

## What's inside

### Skills

25 skills in six groups under [`skills/`](skills). Eleven are manual and run only when called by name; the rest trigger on their own from their descriptions.

| Group | Skills |
| --- | --- |
| `workflow` | `research` · `grilling` · `implement` · `retro` — from alignment to delivery; forked from [mattpocock/skills](https://github.com/mattpocock/skills) |
| `development` | `better-test` · `prototype` · `architecture-audit` · `fan-out` · `writing-for-agents` · `pr` · `ship` · `project-setup` · `eli5` |
| `frontend` | `ui-craft` · `ui-picks` |
| `creative` | `gpt-image` · `promo` · `copywriting` · `post` · `video` |
| `operations` | `better-computer-use` · `better-browser-use` · `herdr` · `ssh` |
| `web-search` | `web-search` — Anthropic and OpenAI search with your Pi logins, TinyFish for fast results and page text |

A few worth opening first: `implement` writes the acceptance test, watches it fail, then builds the whole slice. `better-test` decides which tests deserve to exist. `ui-craft` is the taste guide the agent reads before touching any UI. Every image on this page came out of `promo` and `gpt-image`.

### Config

[`config/`](config) holds the real files from my machine, not templates:

- **Pi** — settings, keybindings, models, the FireCode role table, and `SYSTEM.md`, my system prompt. It swaps your agent's tone and working habits for mine, so SETUP.md has your agent flag it first and you can skip it.
- **Terminal** — Ghostty with a cursor shader, Herdr, Starship, fastfetch and a zsh snippet. Everything follows the system appearance: Catppuccin Mocha in dark mode, Latte in light.

### Tools

[Pi](https://pi.dev) as the coding agent, with FireCode on top · [Herdr](https://herdr.dev) terminal multiplexer · [Ghostty](https://ghostty.org) + [Starship](https://starship.rs) + zsh · bcu for the desktop · [agent-browser](https://github.com/vercel-labs/agent-browser) and [CloakBrowser](https://cloakbrowser.dev) for the web, always in an isolated browser, never your everyday one.

## Two tools I built for it

**[bcu](https://github.com/Suge8/better-computer-use)** lets an agent see and operate any macOS app from the shell. It reads a window as a tree of actionable elements and acts in the background first, taking the foreground only when an app insists on it.

```bash
brew install --cask suge8/tap/bcu
```

<p align="center"><img alt="bcu fills in and ticks a test app while its window stays in the background" src="assets/bcu-demo.gif" width="100%"></p>

**[FireCode](https://github.com/Suge8/firecode)** adds multi-agent orchestration and adversarial code review to Pi: a commander hands work to sub-agents, each role with its own model, and several models review each change in parallel, sending every FAIL straight back to the agent to fix.

```bash
pi install npm:pi-firecode
```

## Requirements

Apple Silicon Mac, macOS 14 or later. SETUP.md also needs Homebrew and Node 22.13+.

## License

[MIT](LICENSE). This is a personal setup shared as is: no promise of compatibility with future versions. SETUP.md ends with a list of everything it installs and every file it touches, so you can undo it by hand.

Made by Fried Bun · [@Suge_dif](https://x.com/Suge_dif)
