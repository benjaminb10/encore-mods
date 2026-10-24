# Prompt select (experimental: macOS + Hammerspoon)

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) from [Encore Mods](../../README.md). Cmd+A on your prompt, like in any text field.

Claude Code's prompt has no selection you can start from the keyboard, and the terminal keeps Cmd+A for itself (it selects the whole screen). With this mod and its Hammerspoon script, in the terminal:

- **Cmd+A** paints the whole prompt like a mouse selection.
- then **Delete** clears it, **Cmd+C** copies it (the selection stays), **Cmd+X** copies and clears it, and **a letter** replaces it.
- **Escape** or an arrow key cancels. Elsewhere in the app, Cmd+A works as before.

Handy when a dictated prompt went wrong, or to keep a prompt for later.

**Experimental**: it needs [Hammerspoon](https://www.hammerspoon.org) and only recognises the [Orca](https://github.com/stablyai/orca) terminal for now (it looks for xterm.js's input field through macOS accessibility). It goes away once Claude Code gets a keyboard "select all" ([anthropics/claude-code#99752](https://github.com/anthropics/claude-code/issues/99752)).

## Install

1. The mod:

   ```
   /plugin marketplace add benjaminb10/encore-mods
   /plugin install prompt-select@encore-mods
   ```

   Then `/reload-plugins` or restart Claude Code.

2. The Hammerspoon script: copy [`hammerspoon/prompt-select.lua`](hammerspoon/prompt-select.lua) to `~/.hammerspoon/`, add this line to `~/.hammerspoon/init.lua`, and reload Hammerspoon:

   ```lua
   promptSelect = require("prompt-select")  -- global, or the garbage collector stops it
   ```

   Hammerspoon needs the Accessibility right (System Settings > Privacy & Security > Accessibility).

## How it works

- The mod writes your prompt's text to `~/Library/Caches/prompt-select/prompts/<session>.txt` whenever it changes. The session whose file changed last is the one you are typing in.
- On Cmd+A in Orca's terminal, the script writes `on` to `~/Library/Caches/prompt-select/select/<session>`, and the mod paints the prompt. Delete sends Ctrl+L (Claude Code's `chat:clearInput`), Cmd+C copies the text from the prompt file.
- The script turns on Orca's accessibility tree (`AXManualAccessibility`) so it can tell the terminal from Orca's other fields.

## What it can reach

Your prompt's text (written to the cache folder above, on your Mac only), your prompt box (to paint it). The script reads your keys while Orca's terminal has focus, and the clipboard when you press Cmd+C or Cmd+X. Nothing goes over the network.
