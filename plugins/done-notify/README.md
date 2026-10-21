# Done notify

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) from [Encore Mods](../../README.md). Look away while Claude works.

- A desktop notification when a turn that took at least 15 seconds ends.
- **Claude is waiting for you** when the reply ends with a question or a list of choices, **Claude is done** otherwise, with the reply's first line.
- On macOS, clicking it brings back the terminal app you run Claude in.
- Uses `terminal-notifier` when installed (`brew install terminal-notifier`), then `osascript`, then `notify-send` on Linux.

## Install

```
/plugin marketplace add benjaminb10/encore-mods
/plugin install done-notify@encore-mods
```

Then `/reload-plugins` or restart Claude Code. Needs Claude Code 2.1.287 or later.

## Options

`min_seconds`: the shortest turn that notifies (default 15). Set it in `/plugin`, or with `/plugin configure done-notify@encore-mods`.

## Try it without installing

```bash
git clone https://github.com/benjaminb10/encore-mods
claude --plugin-dir encore-mods/plugins/done-notify
```
