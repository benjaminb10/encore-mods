import { expect, test } from 'claude-code/testing'
import { summary, isWaiting } from '../hooks/register.js'

test('waiting or done', async () => {
  expect(isWaiting('Should I deploy?')).toBe(true)
  expect(isWaiting('Pick one:\n- A\n- B')).toBe(true)
  expect(isWaiting('Deployed. All tests pass.')).toBe(false)
})

test('summary is the first line, cleaned', async () => {
  expect(summary('## **Done**: pushed `main`\nmore')).toBe('Done: pushed main')
})
