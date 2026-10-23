// bang-commands: when Claude asks you to run `! command` yourself (a login, a command that needs your shell),
// the command becomes a button in the reply, above the prompt and as ghost text in the empty prompt box.
// A click types "!" into the prompt (Claude Code's own bash mode, on macOS) and adds the command after it:
// press Enter and it runs as if you had typed it. Where "!" can't be typed, "!command" goes in as text and,
// on Enter, the mod runs it itself and hands Claude the command with its output.

const MAX_COMMANDS = 4
const RUN_TIMEOUT_MS = 120000

let commands = [] // the `! command`s in Claude's last reply
let filled = null // the last command a click put in the prompt box

const BANG_LINE = /^\s*(?:[-*>]\s+)?`{0,3}!\s*(\S.*?)`{0,3}\s*$/

function fit(s, n) {
  return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s
}

// The commands Claude asks you to run: alone on their line (in a code fence or not, with their `\`
// continuation lines), or quoted in a sentence between backticks.
export function parseBangCommands(answer) {
  if (!answer) return []
  const out = []
  const lines = String(answer).replace(/\r/g, '').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(BANG_LINE)
    if (m && !/^=/.test(m[1])) {
      let cmd = m[1]
      while (/\\$/.test(cmd) && i + 1 < lines.length) cmd += '\n' + lines[++i].replace(/`{3}\s*$/, '')
      out.push(cmd.trim())
      continue
    }
    for (const n of lines[i].matchAll(/`!\s*([^`]+)`/g)) out.push(n[1].trim())
  }
  return [...new Set(out.filter(Boolean))].slice(0, MAX_COMMANDS)
}

// The reply cut around the commands alone on their line, so each one is drawn in place as a button.
// A code fence that only wrapped the command goes with it.
export function splitAtBangs(answer) {
  const lines = String(answer || '').replace(/\r/g, '').split('\n')
  const parts = []
  let md = []
  const flush = () => {
    const t = md.join('\n').replace(/^\s*\n|\n\s*$/g, '')
    if (t.trim()) parts.push({ md: t })
    md = []
  }
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(BANG_LINE)
    if (!m || /^=/.test(m[1])) { md.push(lines[i]); continue }
    let cmd = m[1]
    while (/\\$/.test(cmd) && i + 1 < lines.length) cmd += '\n' + lines[++i].replace(/`{3}\s*$/, '')
    let k = md.length - 1
    while (k >= 0 && !md[k].trim()) k--
    const fenced = k >= 0 && /^\s*`{3}[\w-]*\s*$/.test(md[k])
    if (fenced) md = md.slice(0, k)
    flush()
    parts.push({ cmd: cmd.trim() })
    if (fenced) {
      let j = i + 1
      while (j < lines.length && !lines[j].trim()) j++
      if (j < lines.length && /^\s*`{3}\s*$/.test(lines[j])) i = j
    }
  }
  flush()
  return parts
}

function label(cmd, n) {
  return '▶ ' + fit('! ' + cmd.replace(/\s*\\\n\s*/g, ' '), n)
}

// What Claude reads when the mod ran the command itself
export function report(cmd, r) {
  let out = ((r.stdout || '') + (r.stderr ? (r.stdout ? '\n' : '') + r.stderr : '')).replace(/\s+$/, '')
  if (out.length > 20000) out = out.slice(0, 20000) + '\n… (output cut)'
  const status = r.timedOut ? 'stopped after 2 min' : 'exit code ' + r.exitCode
  return 'I ran the command (' + status + '):\n```\n$ ' + cmd + '\n' + (out || '(no output)') + '\n```'
}

// A click: "!" typed by macOS into the empty prompt box, as by hand, so Claude Code switches to bash mode,
// then the command after it. Elsewhere (or without the Accessibility right) "!command" goes in as text.
async function fill($, cmd) {
  filled = cmd
  await $.prompt.fill({ text: '', mode: 'replace' })
  let typed = false
  try {
    const r = await $.process.run(['osascript', '-e', 'tell application "System Events" to keystroke "!"'])
    typed = r.exitCode === 0
  } catch {}
  if (typed) {
    await new Promise((ok) => $.clock.after(150, ok))
    const box = await $.prompt.read()
    // Bash mode took the "!": the box is empty and waits for the command
    if ((box.text || '') === '') { await $.prompt.fill({ text: cmd, mode: 'insert' }); return }
  }
  await $.prompt.fill({ text: '!' + cmd, mode: 'replace' })
}

// The commands Claude asked for in its last few replies (the module's own memory starts over on a reload)
async function askedLately($) {
  try {
    const replies = (await $.session.messages()).filter((m) => m.role === 'assistant' && m.text).slice(-6)
    return replies.flatMap((m) => parseBangCommands(m.text))
  } catch {
    return []
  }
}

async function run($, cmd) {
  $.ui.status('⏳ ! ' + fit(cmd.split('\n')[0], 60))
  try {
    const cwd = String((await $.session.cwd()) || '')
    let shell = '/bin/sh'
    try { shell = (await $.env.get('SHELL')) || shell } catch {}
    const r = await $.process.run([shell, '-lc', cmd], cwd ? { cwd, timeoutMs: RUN_TIMEOUT_MS } : { timeoutMs: RUN_TIMEOUT_MS })
    return report(cmd, r)
  } catch (err) {
    return report(cmd, { exitCode: -1, stdout: '', stderr: String((err && err.message) || err), timedOut: /timed? ?out/i.test(String(err)) })
  } finally {
    $.ui.status(undefined)
  }
}

// "!command" that reached the prompt as text: run it when it is one Claude asked for, never anything else,
// so your own bash mode (which never comes through here) is untouched.
async function onSubmit($, e, next) {
  const asked = commands
  commands = []
  $.ui.invalidate('ui.render')
  const bang = /^\s*!\s*(\S[\s\S]*)$/.exec(e.text || '')
  const wanted = bang && bang[1].trim()
  if (wanted && (!e.origin || e.origin.kind === 'composer') && (wanted === filled || asked.includes(wanted) || (await askedLately($)).includes(wanted))) {
    filled = null
    $.ui.toast('bang-commands: running ! ' + fit(wanted.split('\n')[0], 50))
    return next({ ...e, text: await run($, wanted) })
  }
  return next(e)
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    try {
      const last = (await $.session.messages()).filter((m) => m.role === 'assistant').at(-1)
      if (last && last.text) commands = parseBangCommands(last.text)
    } catch {}
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => onSubmit($, e, next)).catch(() => undefined)

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) return next(e)
    if (!e.isAborted) {
      commands = parseBangCommands(e.answer)
      if (commands.length) $.prompt.suggest({ text: '!' + commands[0] }).catch(() => {})
    }
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // A reply that asks for `! command`: the command's own line becomes the button, in place
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const text = (e.props && e.props.text) || ''
    const cmds = parseBangCommands(text)
    if (!cmds.length) return next(e)
    const { Box, Button, Markdown } = $.ui.resolve(e)
    const cols = Math.max(30, ((e.viewport && e.viewport.columns) || 80) - 6)
    const parts = splitAtBangs(text)
    const placed = new Set(parts.filter((p) => p.cmd).map((p) => p.cmd))
    const button = (c, key) => Button({ key, label: label(c, cols - 22) + '   ← click: to the prompt', plain: true, onPress: () => fill($, c) })
    const children = []
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      const top = i ? 1 : 0
      if (p.cmd) children.push(Box({ key: 'c' + i, paddingLeft: 2, marginTop: top, children: [button(p.cmd, 'bang-' + i)] }))
      // The first text keeps the engine's own drawing (the reply's bullet); the rest is drawn the same way
      else if (i === 0) children.push(await next({ ...e, props: { ...e.props, text: p.md } }))
      else children.push(Box({ key: 'm' + i, paddingLeft: 2, marginTop: top, children: [Markdown({ key: 'md-' + i, text: p.md })] }))
    }
    // Commands only quoted in a sentence: a button under the block
    cmds.filter((c) => !placed.has(c)).forEach((c, i) => children.push(Box({ key: 'q' + i, paddingLeft: 2, children: [button(c, 'quoted-' + i)] })))
    return Box({ flexDirection: 'column', children })
  })

  // The same buttons above the prompt, while the reply is fresh
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.isWorking || !commands.length) return next(e)
    const { Box, Button } = $.ui.resolve(e)
    const cols = Math.max(30, (e.props.bodyColumns || 80) - 4)
    const rows = commands.map((c, i) => Button({ key: 'bang-' + i, label: label(c, cols), plain: true, onPress: () => fill($, c) }))
    const theirs = await next(e)
    return Box({ flexDirection: 'column', children: [...rows, theirs] })
  })
}
