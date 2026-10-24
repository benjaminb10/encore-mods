// prompt-select (experimental, macOS + Hammerspoon): Claude Code's prompt has no selection, and a terminal keeps
// Cmd+A for itself, so this mod works with a Hammerspoon script (hammerspoon/prompt-select.lua) that catches
// Cmd+A in the terminal. This side does two things:
// - writes the prompt's text to ~/Library/Caches/prompt-select/prompts/<session>.txt whenever it changes, so the
//   script can copy it (the session whose file changed last is the one being typed in);
// - watches ~/Library/Caches/prompt-select/select/<session> ("on <n>" / "off <n>") and paints the whole prompt
//   like a mouse selection, or unpaints it.

const PAINT = { backgroundColor: '#3A5F9E', color: 'white' }

// The prompt painted as selected (or not), for prompt.fill's decorations
export function paint(text, on) {
  return on && text ? [{ start: 0, end: text.length, ...PAINT }] : []
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    try {
      const home = await $.env.get('HOME')
      const id = await $.session.id()
      const base = home + '/Library/Caches/prompt-select'
      const file = base + '/prompts/' + id + '.txt'
      const signal = base + '/select/' + id
      let written = null
      let seen = null
      $.clock.every(400, async () => {
        try {
          const box = await $.prompt.read()
          const text = box.text || ''
          if (text === written) return
          written = text
          await $.fs.write(file, text)
        } catch {}
      })
      $.clock.every(120, async () => {
        try {
          if (!(await $.fs.exists(signal))) return
          const v = String(await $.fs.read(signal)).trim()
          if (v === seen) return
          const first = seen === null
          seen = v
          // A signal left from before this session started is not a new Cmd+A
          if (first) return
          const box = await $.prompt.read()
          const text = box.text || ''
          if (!text) return
          await $.prompt.fill({ text, mode: 'replace', decorations: paint(text, v.startsWith('on')) })
        } catch {}
      })
    } catch {}
    return next(e)
  })
}
