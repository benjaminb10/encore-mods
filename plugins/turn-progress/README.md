# Turn progress

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) from [Encore Mods](../../README.md). See what Claude is up to without scrolling the transcript.

- While a turn runs: `⏳ 2m 05s · 14 actions · ▰▰▰▱▱▱▱▱▱▱ 3/10 · 2 agents running`.
- A second line with the step running now, such as `↳ Bash: Run the test suite`.
- Disappears when the turn ends.

## Install

```
/plugin marketplace add benjaminb10/encore-mods
/plugin install turn-progress@encore-mods
```

Then `/reload-plugins` or restart Claude Code. Needs Claude Code 2.1.287 or later.

## Try it without installing

```bash
git clone https://github.com/benjaminb10/encore-mods
claude --plugin-dir encore-mods/plugins/turn-progress
```
