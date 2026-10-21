import { expect, test } from 'claude-code/testing'
import { parseSuggestions } from '../hooks/register.js'

const BAND = {
  plugin: 'next-prompts', component: 'AbovePrompt', surface: 'terminal',
  viewport: { columns: 100, rows: 30 },
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 90, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

test('list under a Next steps heading', async () => {
  const a = 'Done.\n\n**Next steps:**\n1. Run `npm test`.\n2. Push **main**.\n3. Open the PR.\n'
  expect(parseSuggestions(a)).toEqual(['Run npm test.', 'Push main.', 'Open the PR.'])
})

test('translated heading', async () => {
  expect(parseSuggestions('Ok.\n\n**Suites possibles :**\n1. A\n2. B\n')).toEqual(['A', 'B'])
})

test('choices that end a reply after a question', async () => {
  expect(parseSuggestions('Which one?\n\n- Option A (recommended)\n- Option B\n')).toEqual(['Option A (recommended)', 'Option B'])
})

test('a heading quoted mid-sentence or a list mid-reply is ignored', async () => {
  const a = '| mod | It recognises "Next steps" |\n\n- **Checked:**\n  - 19 tests\n- Nothing personal\n\nMake it public?\n\n- Yes\n- Wait\n'
  expect(parseSuggestions(a)).toEqual(['Yes', 'Wait'])
  expect(parseSuggestions('**Next steps:**\n1. A\n2. B\n\nSources: x')).toEqual([])
  expect(parseSuggestions('Next steps:\n\n1. A\n\n2. B\n')).toEqual(['A', 'B'])
})

test('an ordinary list is not a follow-up list', async () => {
  expect(parseSuggestions('The steps:\n- a\n- b\n\nThat is all.')).toEqual([])
})

test('a click fills the prompt box without sending', async ($, on) => {
  const filled: string[] = []
  on('turn.complete', () => ({ text: '' }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('prompt.suggest', () => ({ isShown: true }))
  on('prompt.fill', ($, e) => { filled.push(e.text); return { isFilled: true, text: e.text, cursor: e.text.length } })
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }))
  await $.turn.complete({ answer: 'Ok.\n\nNext steps:\n1. Run the tests\n2. Commit and push\n', durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' })
  const ui = await $.ui.mount(BAND)
  await ui.press({ key: 'next-prompt-1' })
  expect(filled).toEqual(['Commit and push'])
  await ui.unmount()
})
