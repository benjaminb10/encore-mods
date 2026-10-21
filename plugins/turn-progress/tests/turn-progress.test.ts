import { expect, test } from 'claude-code/testing'
import { duration, bar, toolLabel } from '../hooks/register.js'

test('formats', async () => {
  expect(duration(13_400)).toBe('13s')
  expect(duration(125_000)).toBe('2m 05s')
  expect(bar(3, 6, 6)).toBe('▰▰▰▱▱▱')
  expect(toolLabel({ tool: 'Bash', description: 'Run the tests' })).toBe('Bash: Run the tests')
  expect(toolLabel({ tool: 'mcp__github__create_pr' })).toBe('github create_pr')
})
