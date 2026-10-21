// paid-api-meter: counts the calls this session makes to paid generation APIs (image, video, voice,
// LLM providers), through MCP tools or curl, and shows the total above the prompt. When a response
// reports what the call cost, the amount is added up too.

const DEFAULT_SERVICES = [
  'fal', 'elevenlabs', 'heygen', 'replicate', 'openai', 'runway', 'veo', 'suno', 'treg', 'stability',
  'midjourney', 'luma', 'kling', 'ideogram', 'deepgram', 'assemblyai',
]
const DEFAULT_HOSTS = [
  'api.elevenlabs.io', 'fal.run', 'queue.fal.run', 'api.replicate.com', 'api.heygen.com', 'api.openai.com',
  'generativelanguage.googleapis.com', 'api.runwayml.com', 'api.stability.ai', 'api.lumalabs.ai',
  'api.deepgram.com', 'api.assemblyai.com',
]
const PRICE = /"?(?:cost|price|charged|spent|amount_usd|cost_usd|credits_used)[a-z_]*"?\s*[:=]\s*"?\$?\s*(\d+(?:\.\d+)?)/i

let toolRe = null
let hostRe = null
let calls = 0
let cost = 0

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function build(services, hosts) {
  return {
    tool: new RegExp('^mcp__.*(' + services.map(escape).join('|') + ')', 'i'),
    host: new RegExp('(' + hosts.map(escape).join('|') + ')', 'i'),
  }
}

export function isPaid(e, re) {
  const tool = String(e.tool || '')
  if (tool === 'Bash') return /\b(curl|wget|http|xh)\b/.test(String(e.command || '')) && re.host.test(String(e.command || ''))
  return re.tool.test(tool)
}

export function priceOf(text) {
  const m = String(text).match(PRICE)
  return m ? Number(m[1]) || 0 : 0
}

const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean)

export function register(on, options = {}) {
  const re = build([...DEFAULT_SERVICES, ...list(options.extra_services)], [...DEFAULT_HOSTS, ...list(options.extra_hosts)])
  toolRe = re.tool
  hostRe = re.host

  on('tool.call', async ($, e, next) => {
    const paid = isPaid(e, { tool: toolRe, host: hostRe })
    const result = await next(e)
    if (paid && !result.deny && !result.isError) {
      calls += 1
      let text = ''
      try { text = JSON.stringify(result).slice(0, 200000) } catch {}
      cost += priceOf(text)
      $.ui.invalidate('ui.render')
    }
    return result
  }).catch(() => undefined)

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.isWorking || !calls) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const label = '$ ' + calls + ' paid API call' + (calls === 1 ? '' : 's') + (cost ? ' · ~$' + cost.toFixed(2) : '')
    const theirs = await next(e)
    return Box({ flexDirection: 'column', children: [Text({ dimColor: true, children: [label] }), theirs] })
  })
}
