import { expect, test } from 'claude-code/testing'
import { build, isPaid, priceOf } from '../hooks/register.js'

const re = build(['fal', 'elevenlabs'], ['api.elevenlabs.io'])

test('paid calls', async () => {
  expect(isPaid({ tool: 'mcp__fal__generate_image' }, re)).toBe(true)
  expect(isPaid({ tool: 'Bash', command: 'curl -s https://api.elevenlabs.io/v1/tts' }, re)).toBe(true)
  expect(isPaid({ tool: 'Bash', command: 'echo api.elevenlabs.io' }, re)).toBe(false)
  expect(isPaid({ tool: 'mcp__github__list' }, re)).toBe(false)
})

test('reported price', async () => {
  expect(priceOf('{"cost_usd": 0.042}')).toBe(0.042)
  expect(priceOf('no price here')).toBe(0)
})
