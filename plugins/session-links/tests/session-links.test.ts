import { expect, test } from 'claude-code/testing'
import { extractLinks } from '../hooks/register.js'

test('local servers and deploys', async () => {
  expect(extractLinks('  ➜  Local:   http://localhost:5173/\n', true)).toEqual(['http://localhost:5173/'])
  expect(extractLinks('listening on http://0.0.0.0:3000', true)).toEqual(['http://localhost:3000'])
  expect(extractLinks('Production: https://app-abc.vercel.app [3s]', true)).toEqual(['https://app-abc.vercel.app'])
  expect(extractLinks('https://site-x.netlify.app', true)).toEqual(['https://site-x.netlify.app'])
})

test('ordinary links are ignored', async () => {
  expect(extractLinks('see https://docs.stripe.com/x for more', false)).toEqual([])
  expect(extractLinks('https://site-x.netlify.app', false)).toEqual([])
})
