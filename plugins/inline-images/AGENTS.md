# Agent notes

- Type-check with `npx -p typescript tsc -p .`. The local `tsconfig.json` is gitignored. It must extend
  `./.claude-plugin/types/tsconfig.json` and add `"lib": ["es2023", "esnext.typedarrays"]`, because the engine
  config lacks the types for `Uint8Array.fromBase64` and `toBase64`, which the runtime has.
- To see what a terminal draws, capture its window: `screencapture -l $(osascript -e 'tell application "iTerm2" to id of current window') -o -x out.png`.
- To release, bump `version` in `.claude-plugin/plugin.json` and commit. Installed copies only update when that
  version changes.
- Orca (1.4.230+) needs `CLAUDE_CODE_FORCE_TERMINAL_IMAGES=1` in the settings `env` block and a full restart of the
  session (`/reload-plugins` is not enough). It only reads kitty image files from the project or `$TMPDIR` (not `/tmp`)
  and draws an empty frame otherwise, hence the copy into `$TMPDIR/claude-inline-images`.
