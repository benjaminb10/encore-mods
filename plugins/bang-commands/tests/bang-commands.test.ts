import { expect, test } from 'claude-code/testing'
import { parseBangCommands, splitAtBangs, report } from '../hooks/register.js'

const BAND = {
  plugin: 'bang-commands', component: 'AbovePrompt', surface: 'terminal',
  viewport: { columns: 100, rows: 30 },
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 90, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

test('commands alone on their line, in a fence, or quoted in a sentence', async () => {
  const a = 'Run this:\n\n! cd ~/app && make deploy STAGE="$(cat .stage)"\n\nOr `! gcloud auth login`.\n\n```\n! npm run build \\\n  --prod\n```\nAnd x != y.'
  expect(parseBangCommands(a)).toEqual([
    'cd ~/app && make deploy STAGE="$(cat .stage)"',
    'gcloud auth login',
    'npm run build \\\n  --prod',
  ])
  expect(parseBangCommands('Nothing to run here!\nGreat!')).toEqual([])
})

test('the reply cut around its commands, a wrapping fence included', async () => {
  expect(splitAtBangs('Here.\n\n```bash\n! echo ok\n```\n\nThen tell me.')).toEqual([{ md: 'Here.' }, { cmd: 'echo ok' }, { md: 'Then tell me.' }])
  expect(splitAtBangs('! ls\nEnd')).toEqual([{ cmd: 'ls' }, { md: 'End' }])
})

test('a click without the Accessibility right puts "!command" in the prompt as text', async ($, on) => {
  const filled: string[] = []
  on('ui.invalidate', () => ({ value: undefined }))
  on('prompt.suggest', () => ({ isShown: true }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '' } }))
  on('prompt.fill', ($, e) => { filled.push(e.mode + ':' + e.text); return { isFilled: true, text: e.text, cursor: e.text.length } })
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }))
  on('turn.complete', () => ({ text: '' }))
  await $.turn.complete({ answer: 'Run:\n\n! gcloud auth login\n', durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' })
  const ui = await $.ui.mount(BAND)
  await ui.press({ key: 'bang-0' })
  expect(filled).toEqual(['replace:', 'replace:!gcloud auth login'])
  await ui.unmount()
})

test('"!command" sent as text: run by the mod when Claude asked for it, untouched otherwise', async ($, on) => {
  const sent: string[] = []
  on('ui.invalidate', () => ({ value: undefined }))
  on('prompt.suggest', () => ({ isShown: true }))
  on('session.cwd', () => ({ value: '/tmp' }))
  on('env.get', () => ({ value: '/bin/zsh' }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'it works\n', stderr: '' } }))
  on('prompt.submit', ($, e) => { sent.push(e.text); return { text: e.text } })
  on('turn.complete', () => ({ text: '' }))
  await $.prompt.submit({ text: '!ls' })
  expect(sent[0]).toBe('!ls')
  sent.length = 0
  await $.turn.complete({ answer: 'Try:\n\n! echo "it works"\n', durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' })
  await $.prompt.submit({ text: '!echo "it works"', origin: { kind: 'composer' } } as any)
  expect(sent[0]).toBe(report('echo "it works"', { exitCode: 0, stdout: 'it works\n', stderr: '' }))
})
