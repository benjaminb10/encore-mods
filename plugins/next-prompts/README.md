# Next prompts

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) from [Encore Mods](../../README.md). Claude often ends a reply with a few follow-ups ("Next steps: 1. … 2. …") or a question with choices. This mod turns them into buttons above the prompt.

- **Click** a follow-up (or type its digit alone in the empty prompt and pause): it lands in the prompt box, unsent, so you can edit it first.
- The **first one shows as dim ghost text** in the empty prompt box. Press Tab to take it.
- **Preview with the keyboard**: `ctrl+x tab` to focus the buttons, then up/down. Each one shows as ghost text as you move.
- Full text, wrapped on as many lines as needed. Nothing is cut.
- Recognises "Next steps", "Follow-ups", "What's next" and their French, Spanish, German and Italian versions, plus a list of choices that ends a reply right after a question.

## Install

```
/plugin marketplace add benjaminb10/encore-mods
/plugin install next-prompts@encore-mods
```

Then `/reload-plugins` or restart Claude Code. Needs Claude Code 2.1.287 or later.

## Options

`heading`: one more heading to recognise, for example `Ideas`. Set it in `/plugin`, or with `/plugin configure next-prompts@encore-mods`.

Tip: ask Claude for follow-ups in your `CLAUDE.md`, for example: *End each reply where work remains with **Next steps:** and 3 numbered, one-line follow-ups.*

## Try it without installing

```bash
git clone https://github.com/benjaminb10/encore-mods
claude --plugin-dir encore-mods/plugins/next-prompts
```
