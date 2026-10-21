# Trash guard

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) from [Encore Mods](../../README.md). Claude never deletes anything for good.

- `rm`, `unlink`, `rmdir`, `git clean` and `find -delete` are refused outside temporary folders (`/tmp`, `/var/folders`).
- Claude reads why and moves the files to the Trash instead (`trash` on macOS 14+, Finder with Put Back, or `gio trash` on Linux), so you can always undo.
- No false alarms on text: a commit message, an `echo` or a file written through a heredoc that mentions `rm` goes through.
- Still catches `rm` hidden in `$( … )`, after `&&`, `;` or `sudo`.

## Install

```
/plugin marketplace add benjaminb10/encore-mods
/plugin install trash-guard@encore-mods
```

Then `/reload-plugins` or restart Claude Code. Needs Claude Code 2.1.287 or later.

## Options

`allowed_paths`: comma-separated absolute folders where `rm` stays allowed, such as a build cache. Set it in `/plugin`, or with `/plugin configure trash-guard@encore-mods`.

## Try it without installing

```bash
git clone https://github.com/benjaminb10/encore-mods
claude --plugin-dir encore-mods/plugins/trash-guard
```
