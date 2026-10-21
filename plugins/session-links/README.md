# Session links

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) from [Encore Mods](../../README.md). The URLs you need stay one click away.

- Collects local dev servers (`http://localhost:5173`) and deploy URLs (Vercel, Netlify, Cloudflare Pages, Fly, Render, Railway, Heroku, or any URL on a line that reads like a deploy log) seen during the session.
- Shows the last 4 above the prompt. Click to open in your browser.
- Checks local servers every 20 seconds and dims the ones that stopped, marked `(down)`.

## Install

```
/plugin marketplace add benjaminb10/encore-mods
/plugin install session-links@encore-mods
```

Then `/reload-plugins` or restart Claude Code. Needs Claude Code 2.1.287 or later.

## Try it without installing

```bash
git clone https://github.com/benjaminb10/encore-mods
claude --plugin-dir encore-mods/plugins/session-links
```
