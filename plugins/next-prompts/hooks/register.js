// next-prompts: the follow-ups Claude suggests at the end of a reply become buttons above the prompt.
// Click one (or type its digit alone in the empty prompt and pause) to put it in the prompt box, unsent.
// The first one also shows as dim ghost text in the prompt box (Tab takes it), and moving through the
// buttons with the keyboard (ctrl+x tab, then up/down) previews each one the same way.

const MAX = 6

// Headings that introduce suggested follow-ups, in a few languages. Add your own with the `heading` option.
const HEADINGS = [
  'next steps?', 'suggested next steps?', 'possible next steps?', "what's next", 'follow[- ]ups?',
  'suites possibles', 'prochaines étapes', 'próximos pasos', 'nächste schritte', 'prossimi passi',
]

let suggestions = []
let pressed = -1 // the follow-up just chosen, highlighted for a moment
let headingRe = buildHeading('')

function buildHeading(extra) {
  const parts = [...HEADINGS]
  if (extra && extra.trim()) parts.push(extra.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  // The heading alone on its line ("**Next steps:**"), not quoted in the middle of a sentence
  return new RegExp('^[\\s#>*_]*(?:' + parts.join('|') + ')[\\s*_]*:?[\\s*_]*$', 'i')
}

function clean(s) {
  return s
    .replace(/\*\*|__|`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

// A top-level list item (not an indented sub-item)
const SOURCES = /^[\s#>*_]*(sources|références|references|refs)[\s*_]*:?[\s*_]*$/i
const ITEM = /^ {0,1}(?:\d+[.)]|[-*•])\s+(.+?)\s*$/

// The follow-ups: the list that ends the reply, right after a "Next steps" heading or a question
// ("Which one? - A - B"). Nothing may come after it, so a list in the middle of a reply never counts.
export function parseSuggestions(answer, heading = headingRe) {
  if (!answer) return []
  let lines = answer.replace(/\r/g, '').split('\n')
  // A trailing "Sources:" block (links after a web search) doesn't hide the follow-ups above it
  for (let k = lines.length - 1; k >= 0; k--) {
    if (SOURCES.test(lines[k])) {
      const rest = lines.slice(k + 1).filter((l) => l.trim())
      if (rest.length && rest.every((l) => /^\s*(?:[-*•]|\d+[.)])?\s*\[?[^\n]*\]?\(?https?:\/\//.test(l) || /https?:\/\//.test(l))) lines = lines.slice(0, k)
      break
    }
  }
  let i = lines.length - 1
  const tail = []
  while (i >= 0 && (ITEM.test(lines[i]) || !lines[i].trim())) {
    if (lines[i].trim()) tail.unshift(lines[i].match(ITEM)[1])
    i--
  }
  if (!tail.length || i < 0) return []
  const intro = lines[i]
  const ok = heading.test(intro) || (tail.length >= 2 && /\?\s*\**\s*$/.test(intro))
  return ok ? tail.map(clean).filter(Boolean).slice(0, MAX) : []
}

export function register(on, options = {}) {
  headingRe = buildHeading(options.heading || '')

  // After the mod reloads (or a resumed session), pick up the follow-ups of the last reply again
  on('session.start', async ($, e, next) => {
    try {
      const last = (await $.session.messages()).filter((m) => m.role === 'assistant').at(-1)
      if (last && last.text) suggestions = parseSuggestions(last.text)
    } catch {}
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    suggestions = []
    $.ui.invalidate('ui.render')
    return next(e)
  }).catch(() => undefined)

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) return next(e)
    suggestions = e.isAborted ? [] : parseSuggestions(e.answer)
    if (suggestions.length) $.prompt.suggest({ text: suggestions[0] }).catch(() => {})
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('ui.focus', { component: 'AbovePrompt' }, async ($, e, next) => {
    const m = /^next-prompt-(\d+)$/.exec(e.element || '')
    if (m && suggestions[Number(m[1])]) $.prompt.suggest({ text: suggestions[Number(m[1])] }).catch(() => {})
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.isWorking || !suggestions.length) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const rows = [Text({ dimColor: true, children: ['Next (click, or type the digit):'] })]
    suggestions.forEach((s, i) => {
      // Just chosen: shown inverted for a moment, so you see which one went to the prompt box
      if (i === pressed) {
        rows.push(Text({ key: 'chosen-' + i, inverse: true, children: [(i + 1) + ': ' + s] }))
        return
      }
      rows.push(
        Button({
          key: 'next-prompt-' + i,
          label: s,
          hotkey: String(i + 1),
          plain: true,
          onPress: async () => {
            pressed = i
            $.ui.invalidate('ui.render')
            $.clock.after(1200, () => { pressed = -1; $.ui.invalidate('ui.render') })
            await $.prompt.fill({ text: s })
          },
        }),
      )
    })
    const theirs = await next(e)
    return Box({ flexDirection: 'column', children: [...rows, theirs] })
  })
}
