# Bang commands

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) from [Encore Mods](../../README.md). Sometimes Claude can't run a command itself (a login, something that needs your own shell) and asks you to type `! command`. This mod saves the copy and paste.

- The command's **own line in Claude's reply becomes a button**: `▶ ! gcloud auth login   ← click: to the prompt`. The same button sits above the prompt, and the first command shows as ghost text in the empty prompt box.
- **Click it**: the mod types `!` into the empty prompt, so Claude Code switches to its own bash mode, then adds the command. Press Enter and it runs exactly as if you had typed it, output live.
- Found alone on its line (in a code fence or not, with `\` continuation lines) or quoted in a sentence as `` `! command` ``.

## Install

```
/plugin marketplace add benjaminb10/encore-mods
/plugin install bang-commands@encore-mods
```

Then `/reload-plugins` or restart Claude Code. Needs Claude Code 2.1.287 or later.

## macOS: the Accessibility right

Typing `!` goes through `osascript` (System Events). The first click may ask to let your terminal control System Events, or you can turn your terminal on in **System Settings → Privacy & Security → Accessibility**. The keystroke goes to the frontmost app, so click with the terminal in front.

Without that right (or on Linux and Windows), the click puts `!command` in the prompt as plain text. On Enter the mod runs it itself, in the session's folder with your login shell and a 2 minute limit, and Claude gets the command with its output. It only does that for a command Claude asked for in one of its last replies: anything else you send starting with `!` goes through untouched. A command that waits for keyboard input (a password prompt) needs real bash mode.

## Try it without installing

```bash
git clone https://github.com/benjaminb10/encore-mods
claude --plugin-dir encore-mods/plugins/bang-commands
```
