// session-links: the local dev servers and deploy URLs that show up during a session stay one click
// away above the prompt. A local server that stops answering is dimmed and marked "(down)".

const MAX = 4
const URL_RE = /https?:\/\/[^\s"'<>)\]`*|\\]+/g
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?/
const DEPLOY_LINE = /^\s*(?:[>✓✔✅🔗\-*•]\s*)*(?:production|preview|deployed(?: to)?|aliased|live at|deployment ready)\b[^:]*:?\s*https?:\/\//i
const DEPLOY_HOST = /\.(vercel\.app|netlify\.app|pages\.dev|fly\.dev|onrender\.com|up\.railway\.app|herokuapp\.com)\b/

let links = [] // { url, alive }

// Local URLs anywhere; deploy URLs from tool output (deploy hosts, or lines that read like a deploy
// log) and from Claude's replies only on lines that talk about a deploy.
export function extractLinks(text, fromTool) {
  const found = []
  for (const line of String(text).split(/\\n|\n/)) {
    for (let u of line.match(URL_RE) || []) {
      u = u.replace(/[.,;:!?'"]+$/, '').replace('://0.0.0.0', '://localhost').replace('://127.0.0.1', '://localhost')
      const local = LOCAL.test(u)
      const deploy = DEPLOY_LINE.test(line) || (fromTool && DEPLOY_HOST.test(u))
      if (!local && !deploy) continue
      if (!local && /\/(api|_next|static|assets)\//.test(u)) continue
      if (!found.includes(u)) found.push(u)
    }
  }
  return found
}

// Only output of a command that starts a local server, or deploys, gives links. A URL that merely
// shows up in a file, a log or a history Claude read does not count.
const SERVER_CMD = /\b(npm|pnpm|yarn|bun)\s+(run\s+)?(dev|start|preview|serve)\b|\bvite\b|\bnext\s+(dev|start)\b|\bexpo\s+start\b|\bastro\s+dev\b|\b(wrangler|vercel|netlify)\s+dev\b|\bhttp\.server\b|\bserve\s|\buvicorn\b|\bflask\s+run\b|\bhugo\s+server\b|\brails\s+s(erver)?\b|\bphp\s+-S\b/
const DEPLOY_CMD = /\bvercel\s+(deploy|--prod|-p)\b|\bvercel\s*($|[;&|])|\bnetlify\s+deploy\b|\bwrangler\s+(pages\s+)?deploy\b|\bfly\s+deploy\b|\bfirebase\s+deploy\b|\brailway\s+up\b/m

export function linksFromCommand(command, output, background) {
  const cmd = String(command || '')
  const isServer = background || SERVER_CMD.test(cmd), isDeploy = DEPLOY_CMD.test(cmd)
  if (!isServer && !isDeploy) return []
  return extractLinks(output, true).filter((u) => (LOCAL.test(u) ? isServer : isDeploy))
}

function addLinks(urls) {
  for (const url of urls) {
    links = links.filter((l) => l.url !== url)
    links.unshift({ url, alive: true })
  }
  links = links.slice(0, MAX)
}

function short(url) {
  const s = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return s.length > 40 ? s.slice(0, 39) + '…' : s
}

async function openUrl($, url) {
  for (const cmd of [['open', url], ['xdg-open', url], ['cmd', '/c', 'start', '', url]]) {
    try {
      const r = await $.process.run(cmd)
      if (r.exitCode === 0) return
    } catch {}
  }
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    $.clock.every(20000, async () => {
      let changed = false
      for (const l of links) {
        if (!LOCAL.test(l.url)) continue
        let alive = false
        try {
          const r = await $.http.fetch(l.url, { method: 'HEAD' })
          alive = r.status > 0
        } catch {}
        if (alive) { l.fails = 0; if (!l.alive) { l.alive = true; changed = true } }
        else if ((l.fails = (l.fails || 0) + 1) >= 2) { links = links.filter((x) => x !== l); changed = true }
      }
      if (changed) $.ui.invalidate('ui.render')
    })
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (e.tool === 'Bash') {
      let text = ''
      try { text = JSON.stringify(result).slice(0, 200000) } catch {}
      const urls = linksFromCommand(e.command, text, e.run_in_background === true)
      if (urls.length) { addLinks(urls); $.ui.invalidate('ui.render') }
    }
    return result
  }).catch(() => undefined)

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId && !e.isAborted) {
      const urls = extractLinks(e.answer || '', false)
      if (urls.length) { addLinks(urls); $.ui.invalidate('ui.render') }
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.isWorking || !links.length) return next(e)
    const { Box, Button } = $.ui.resolve(e)
    const items = links.map((l, i) =>
      Button({
        key: 'session-link-' + i,
        label: '↗ ' + short(l.url) + (l.alive ? '' : ' (down)'),
        plain: true,
        dimColor: !l.alive,
        onPress: async () => {
          await openUrl($, l.url)
        },
      }),
    )
    const theirs = await next(e)
    return Box({ flexDirection: 'column', children: [Box({ flexDirection: 'row', columnGap: 3, flexWrap: 'wrap', children: items }), theirs] })
  })
}
