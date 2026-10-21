// trash-guard: Claude never deletes for good. `rm`, `unlink`, `rmdir`, `git clean` and `find -delete`
// are refused outside temporary folders, and Claude is told to move things to the Trash instead,
// so anything can be put back. Text inside quotes and heredocs is ignored: a commit message or a
// README that mentions `rm` is not an `rm`.

const TEMP = ['/tmp/', '/private/tmp/', '/var/folders/', '/private/var/folders/']

let allowed = [...TEMP]

// Splits a shell command into simple commands (lists of words), without looking inside quotes or
// heredoc bodies.
export function splitShell(command) {
  const src = command.replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2[ \t]*(?=\n|$)/g, '')
  const cmds = []
  let words = [], word = '', quote = null, has = false
  const endWord = () => { if (has) words.push(word); word = ''; has = false }
  const endCmd = () => { endWord(); if (words.length) cmds.push(words); words = [] }
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      if (c === quote) quote = null
      else if (c === '\\' && quote === '"' && i + 1 < src.length) word += src[++i]
      else word += c
      continue
    }
    if (c === "'" || c === '"') { quote = c; has = true }
    else if (c === '\\' && i + 1 < src.length) { word += src[++i]; has = true }
    else if (c === '#' && !has) { while (i < src.length && src[i] !== '\n') i++; endCmd() }
    else if (/[;&|\n()`]/.test(c) || (c === '$' && src[i + 1] === '(')) endCmd()
    else if (/\s/.test(c)) endWord()
    else { word += c; has = true }
  }
  endCmd()
  return cmds
}

// Returns what would be deleted for good, or null when the command may run.
export function checkDelete(command, cwd, roots = allowed) {
  const inAllowed = (abs) => {
    const p = abs.endsWith('/') ? abs : abs + '/'
    return !/\/\.\.(\/|$)/.test(abs) && roots.some((r) => p.startsWith(r))
  }
  for (const words of splitShell(command)) {
    while (words.length && /^(sudo|command|xargs|exec|nohup|time|env|-\S*|\w+=\S*)$/.test(words[0])) words.shift()
    if (!words.length) continue
    const cmd = words[0].replace(/^.*\//, '')
    if (cmd === 'git' && words[1] === 'clean') return 'git clean'
    if (cmd === 'find' && words.includes('-delete')) return 'find -delete'
    if (cmd !== 'rm' && cmd !== 'unlink' && cmd !== 'rmdir') continue
    const targets = words.slice(1).filter((w) => !w.startsWith('-'))
    if (!targets.length) continue
    const ok = targets.every((t) => {
      if (/[$*?{]/.test(t) && !t.startsWith('/')) return false
      if (t.startsWith('~')) return false
      return inAllowed(t.startsWith('/') ? t : cwd.replace(/\/$/, '') + '/' + t)
    })
    if (!ok) return cmd + ' ' + targets.join(' ')
  }
  return null
}

export function register(on, options = {}) {
  const extra = String(options.allowed_paths || '')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.startsWith('/'))
    .map((p) => (p.endsWith('/') ? p : p + '/'))
  allowed = [...TEMP, ...extra]

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (typeof e.command !== 'string') return next(e)
    const bad = checkDelete(e.command, String((await $.session.cwd()) || "/"))
    if (!bad) return next(e)
    return {
      deny:
        'Refused by trash-guard: nothing is deleted for good here (' + bad + '). ' +
        'Move the files to the Trash instead, with `trash <paths>` on macOS 14 or later, ' +
        'or `osascript -e \'tell application "Finder" to delete POSIX file "/absolute/path"\'` (keeps "Put Back"), ' +
        'or `gio trash <paths>` on Linux. `rm` stays allowed on absolute paths under: ' + allowed.join(', '),
    }
  }).catch(() => undefined)
}
