import { expect, test } from 'claude-code/testing'
import { checkDelete } from '../hooks/register.js'

const ROOTS = ['/tmp/', '/private/tmp/', '/var/folders/', '/private/var/folders/']
const check = (c: string, cwd = '/home/u') => checkDelete(c, cwd, ROOTS)

test('deletes outside temp folders are refused', async () => {
  expect(check('rm -rf ~/project')).toBeTruthy()
  expect(check('cd a && rm file.txt', '/home/u/p')).toBeTruthy()
  expect(check('rm /tmp/../home/u/x')).toBeTruthy()
  expect(check('git clean -fd')).toBeTruthy()
  expect(check('find . -name "*.log" -delete')).toBeTruthy()
  expect(check('ls $(rm -rf ~/x)')).toBeTruthy()
  expect(check('echo "a" && rm ~/b')).toBeTruthy()
  expect(check('echo ok; rm "/home/u/a b.txt"')).toBeTruthy()
})

test('temp folders and plain text are fine', async () => {
  expect(check('rm -f /private/tmp/x/a.wav')).toBe(null)
  expect(check('rm a.wav', '/tmp/work')).toBe(null)
  expect(check("rm '/tmp/x y.txt'")).toBe(null)
  expect(check('trash ~/x && echo rm')).toBe(null)
  expect(check("git commit -m 'refuse git clean and rm -rf'")).toBe(null)
  expect(check("cat > R.md <<'EOF'\n- `git clean` and `rm -rf ~`\nEOF\ngit add -A")).toBe(null)
})

test('extra allowed folders', async () => {
  expect(checkDelete('rm -rf /home/u/cache/x', '/home/u', [...ROOTS, '/home/u/cache/'])).toBe(null)
})

test('the hook refuses with a way out', async ($, on) => {
  on('tool.call', () => ({ result: { stdout: '', stderr: '' } }))
  on('session.cwd', () => ({ value: '/home/u' }))
  const r = await $.tool.call({ tool: 'Bash', command: 'rm -rf ~/Desktop/x' })
  expect(String(r.deny)).toContain('trash')
  const rel = await $.tool.call({ tool: 'Bash', command: 'rm -rf old-notes' })
  expect(String(rel.deny)).toContain('trash')
})
