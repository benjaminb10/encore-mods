// paste-peek: a long paste folds into "[Pasted text #139 +26 lines]" in the prompt box, and Claude Code hands
// plugins no way to read what's behind it before the prompt is sent (the paste doesn't even raise `prompt.edit`).
// So when a new placeholder shows up in the box, this reads the clipboard (pbpaste, wl-paste or xclip), which still holds what was
// just pasted, and keeps it only if its line count matches the placeholder's. A quiet row above the prompt then
// offers View for each placeholder still in the box, opening the whole text in a pane (the arrows scroll it).
// Sending the prompt clears it all.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Paste } from '../types'

const PANE = 'paste-peek'
const pastes = atom({ plugin: 'paste-peek', key: 'pastes' } as const, [])
const box = atom({ plugin: 'paste-peek', key: 'box' } as const, '')
const viewing = atom({ plugin: 'paste-peek', key: 'viewing' } as const, null)

/** The placeholders in a prompt: "[Pasted text #139 +26 lines]" -> { id: 139, extra: 26 }. */
export function placeholders(text: string): { id: number; extra: number | null }[] {
  return [...text.matchAll(/\[Pasted text #(\d+)(?: \+(\d+) lines?)?\]/g)].map(m => ({ id: Number(m[1]), extra: m[2] ? Number(m[2]) : null }))
}

/** Whether a text fits a placeholder's "+N lines" (Claude Code counts the lines past the first, give or take one). */
export function fits(text: string, extra: number | null): boolean {
  if (extra === null) return text.length > 0
  const breaks = text.split('\n').length - 1
  return Math.abs(breaks - extra) <= 1
}

/** The first non-empty line, cut to `max` characters. */
export function preview(text: string, max = 48): string {
  const line = text.split('\n').map(l => l.trim()).find(l => l.length > 0) ?? ''
  return line.length > max ? line.slice(0, max - 1) + '…' : line
}

/** The clipboard's text: pbpaste on macOS, wl-paste or xclip on Linux; '' when none answers. */
async function clipboard($: EngineInterface): Promise<string> {
  for (const argv of [['pbpaste'], ['wl-paste', '--no-newline'], ['xclip', '-o', '-selection', 'clipboard']]) {
    const r = await $.process.run(argv).catch(() => null)
    if (r && r.exitCode === 0) return String(r.stdout)
  }
  return ''
}

/** Notes the box, and for each placeholder not seen yet, takes the clipboard if it matches. */
async function watch($: EngineInterface, text: string) {
  if (text !== (await read($, box))) await update($, box, () => text)
  // The placeholder was erased from the box: its preview goes too
  const open = await read($, viewing)
  if (open !== null && !placeholders(text).some(ph => ph.id === open)) {
    await update($, viewing, () => null)
    await $.ui.close({ id: PANE }).catch(() => undefined)
  }
  const known = new Set((await read($, pastes)).map(p => p.id))
  for (const ph of placeholders(text)) {
    if (known.has(ph.id)) continue
    const pasted = await clipboard($)
    if (!fits(pasted, ph.extra)) continue
    const paste: Paste = { id: ph.id, text: pasted, lines: pasted.split('\n').length }
    await update($, pastes, list => [...list.filter(p => p.id !== paste.id), paste].slice(-10))
  }
}

/** Opens the pane on one pasted text. */
async function show($: EngineInterface, id: number) {
  await update($, viewing, () => id)
  await $.ui.open({ id: PANE, title: `Pasted text #${id}`, closeOnEscape: true })
}

/** View or Hide: the same button opens the text and closes it again. */
async function toggle($: EngineInterface, id: number) {
  if ((await read($, viewing)) === id) {
    await update($, viewing, () => null)
    await $.ui.close({ id: PANE }).catch(() => undefined)
  } else {
    await show($, id)
  }
}

export const register: Register = on => {
  let alive = true

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'paste', description: 'Show the last pasted text in full' })
    // A paste lands without an edit event: look at the box every second
    void (async () => {
      while (alive) {
        const now = await $.prompt.read().catch(() => null)
        if (now) await watch($, now.text).catch(() => undefined)
        await $.clock.sleep(1000)
      }
    })()
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    alive = false
    return next(e)
  })

  on('prompt.edit', async ($, e, next) => {
    const r = await next(e)
    await watch($, r.text)
    return r
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, box, () => '')
    if ((await read($, viewing)) !== null) {
      await update($, viewing, () => null)
      await $.ui.close({ id: PANE }).catch(() => undefined)
    }
    return next(e)
  })

  // Closed with its cross or Esc: the button reads View again
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) await update($, viewing, () => null)
    return next(e)
  })

  on('command.run', { command: 'paste' }, async $ => {
    const list = await read($, pastes)
    const last = list[list.length - 1]
    if (!last) return { text: 'No pasted text caught yet.' }
    await show($, last.id)
    return { text: `Pasted text #${last.id} opened.` }
  })

  // One quiet row per placeholder still in the box, above whatever else sits there
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const ids = new Set(placeholders(await read($, box)).map(p => p.id))
    const shown = (await read($, pastes)).filter(p => ids.has(p.id)).slice(-3)
    if (shown.length === 0 || e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const open = await read($, viewing)
    const theirs = await next(e)
    // The button first, then one line of text cut at the edge, so nothing pushes the button away
    return (
      <Box flexDirection="column">
        {shown.map(p => (
          <Box key={`paste-${p.id}`}>
            <Button key={`view-${p.id}`} label={open === p.id ? 'Hide' : 'View'} onPress={() => toggle($, p.id)} />
            <Text dimColor wrap="truncate-end">
              {' '}Pasted text #{p.id} · {p.lines} lines · “{preview(p.text, 60)}”
            </Text>
          </Box>
        ))}
        {theirs}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const id = await read($, viewing)
    const paste = (await read($, pastes)).find(p => p.id === id)
    if (!paste) return <Text dimColor>This pasted text is gone.</Text>
    return (
      <Box flexDirection="column">
        <Text dimColor>
          {paste.lines} lines · {paste.text.length} characters · Tab here, then the arrows to scroll
        </Text>
        {paste.text.split('\n').map((line, i) => (
          <Text key={`l${i}`}>{line.length > 0 ? line : ' '}</Text>
        ))}
      </Box>
    )
  })
}
