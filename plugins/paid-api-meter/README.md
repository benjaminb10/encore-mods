# Paid API meter

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) from [Encore Mods](../../README.md). Know when a session is spending money outside your Claude plan.

- Counts calls to paid generation APIs made through MCP tools or `curl`: fal, ElevenLabs, HeyGen, Replicate, OpenAI, Runway, Veo, Suno, Stability, Luma, Kling and more.
- Shows `$ 3 paid API calls · ~$0.42` above the prompt. The amount is added up only when a response reports its cost.
- Nothing shows until the first paid call.

## Install

```
/plugin marketplace add benjaminb10/encore-mods
/plugin install paid-api-meter@encore-mods
```

Then `/reload-plugins` or restart Claude Code. Needs Claude Code 2.1.287 or later.

## Options

`extra_services` (words in MCP tool names) and `extra_hosts` (API hosts for `curl`), both comma-separated. Set it in `/plugin`, or with `/plugin configure paid-api-meter@encore-mods`.

## Try it without installing

```bash
git clone https://github.com/benjaminb10/encore-mods
claude --plugin-dir encore-mods/plugins/paid-api-meter
```
