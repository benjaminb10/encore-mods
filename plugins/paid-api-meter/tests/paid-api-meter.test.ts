import { expect, test } from 'claude-code/testing'
import { build, isPaid, priceOf, isFree } from '../hooks/register.js'

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

test('free calls are not counted', async () => {
  expect(isFree('{"cost_usd":0,"body":{}}')).toBe(true)
  expect(isFree('{"cost_usd":0.05}')).toBe(false)
  expect(isFree('{"images":[]}')).toBe(false)
})
