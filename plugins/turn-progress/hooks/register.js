// turn-progress: while Claude works, a line above the prompt shows how long the turn has run, how many
// actions it took, what it is doing right now, the todo list's progress and how many subagents run.

let working = false
let turnStart = 0
let actions = 0
let current = ''
let todos = null // { done, total }

function clean(s) {
  return String(s).replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').trim()
}

function fit(s, n) {
  return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s
}

export function duration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's'
}

export function bar(done, total, width) {
  const n = Math.round((done / Math.max(1, total)) * width)
  return '▰'.repeat(n) + '▱'.repeat(width - n)
}

export function toolLabel(e) {
  const t = String(e.tool || '').replace(/^mcp__/, '').replace(/__/g, ' ')
  const detail = e.description || e.command || e.file_path || e.pattern || e.url || e.query || e.prompt || ''
  return clean(t + (detail ? ': ' + String(detail).split('\n')[0] : ''))
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    $.clock.every(1000, () => {
      if (working) $.ui.invalidate('ui.render')
    })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (!e.agentId) {
      working = true
      turnStart = await $.clock.now()
      actions = 0
      current = ''
      todos = null
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    actions += 1
    if (!e.agentId) current = toolLabel(e)
    if (Array.isArray(e.todos)) {
      todos = { done: e.todos.filter((t) => t.status === 'completed').length, total: e.todos.length }
    }
    $.ui.invalidate('ui.render')
    return next(e)
  }).catch(() => undefined)

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      working = false
      current = ''
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!(e.props.isWorking || working)) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const cols = Math.max(30, (e.props.bodyColumns || 80) - 2)
    const now = await $.clock.now()
    const parts = ['⏳ ' + duration(now - turnStart), actions + (actions === 1 ? ' action' : ' actions')]
    if (todos && todos.total) parts.push(bar(todos.done, todos.total, 10) + ' ' + todos.done + '/' + todos.total)
    let agents = []
    try { agents = await $.agent.list() } catch {}
    const running = agents.filter((a) => a.status === 'running').length
    if (running) parts.push(running + (running === 1 ? ' agent running' : ' agents running'))
    const rows = [Text({ dimColor: true, children: [fit(parts.join(' · '), cols)] })]
    if (current) rows.push(Text({ dimColor: true, children: [fit('↳ ' + current, cols)] }))
    const theirs = await next(e)
    return Box({ flexDirection: 'column', children: [...rows, theirs] })
  })
}
