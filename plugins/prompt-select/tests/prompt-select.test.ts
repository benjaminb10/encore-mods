import { expect, test } from 'claude-code/testing'
import { paint } from '../hooks/register.js'

test('the whole prompt painted as selected, or nothing', async () => {
  expect(paint('hello', true)).toEqual([{ start: 0, end: 5, backgroundColor: '#3A5F9E', color: 'white' }])
  expect(paint('hello', false)).toEqual([])
  expect(paint('', true)).toEqual([])
})
