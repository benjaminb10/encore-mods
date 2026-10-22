import { expect, test } from 'claude-code/testing'

import { fits, placeholders, preview } from '../hooks/register'

test('reads the placeholders Claude Code folds pastes into', () => {
  expect(placeholders('test : [Pasted text #144 +19 lines]')).toEqual([{ id: 144, extra: 19 }])
  expect(placeholders('a [Pasted text #2 +3 lines] b [Pasted text #7] c')).toEqual([{ id: 2, extra: 3 }, { id: 7, extra: null }])
  expect(placeholders('nothing pasted')).toEqual([])
})

test('keeps a clipboard text only when its lines match the placeholder', () => {
  const twenty = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')
  expect(fits(twenty, 19)).toBe(true)
  expect(fits(twenty, 5)).toBe(false)
  expect(fits('short', null)).toBe(true)
  expect(fits('', null)).toBe(false)
})

test('previews the first line that says something, cut short', () => {
  expect(preview('\n\n  Here is the spec to review\nmore')).toBe('Here is the spec to review')
  expect(preview('x'.repeat(80), 10)).toBe('xxxxxxxxx…')
})
