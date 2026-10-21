// done-notify: a desktop notification when a turn that took a while ends, so you can look away while
// Claude works. "Claude is waiting for you" when the reply ends with a question or a list of choices,
// "Claude is done" otherwise. On macOS, clicking it brings back the terminal app you run Claude in.

let minMs = 15000

function clean(s) {
  return String(s).replace(/\*\*|__|`|#+\s*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim()
}

export function summary(answer) {
  const first = clean((answer || '').split('\n').find((l) => l.trim()) || 'Turn finished')
  return first.length > 140 ? first.slice(0, 139) + '…' : first
}

export function isWaiting(answer) {
  const text = (answer || '').trim()
  if (/\?\s*\**$/.test(text)) return true
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const tail = []
  while (lines.length && /^(?:\d+[.)]|[-*•])\s+/.test(lines[lines.length - 1])) tail.unshift(lines.pop())
  return tail.length >= 2 && lines.length > 0 && /[?:]\s*\**$/.test(lines[lines.length - 1])
}

async function notify($, title, message) {
  const app = $.env.get('__CFBundleIdentifier')
  const tn = ['-title', title, '-message', message, '-sound', 'Glass', '-group', 'done-notify-' + $.session.id()]
  if (app) tn.push('-activate', app)
  const tries = [
    ['terminal-notifier', ...tn],
    ['/opt/homebrew/bin/terminal-notifier', ...tn],
    ['/usr/local/bin/terminal-notifier', ...tn],
    ['osascript', '-e', 'display notification ' + JSON.stringify(message) + ' with title ' + JSON.stringify(title) + ' sound name "Glass"'],
    ['notify-send', title, message],
  ]
  for (const cmd of tries) {
    try {
      const r = await $.process.run(cmd)
      if (r.exitCode === 0) return
    } catch {}
  }
}

export function register(on, options = {}) {
  const s = Number(options.min_seconds)
  if (Number.isFinite(s) && s >= 0) minMs = s * 1000

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId && !e.isAborted && e.durationMs >= minMs) {
      await notify($, isWaiting(e.answer) ? 'Claude is waiting for you' : 'Claude is done', summary(e.answer))
    }
    return next(e)
  })
}
