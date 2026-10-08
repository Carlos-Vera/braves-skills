import { expect, test } from 'claude-code/testing'


import { bar, colorFor, fmtDuration, fmtTokens, accountOf, langOf, marquee, tildePath, parseGemini, planOf } from './format'

test('formats the panel figures', () => {
  expect(fmtTokens(950)).toBe('950')
  expect(fmtTokens(12345)).toBe('12.3k')
  expect(fmtTokens(1_200_000)).toBe('1.2M')
  expect(fmtDuration(59_000)).toBe('0m')
  expect(fmtDuration(125 * 60_000)).toBe('2h 5m')
  expect(bar(50, 10)).toBe('▰▰▰▰▰▱▱▱▱▱')
  expect(bar(150, 4)).toBe('▰▰▰▰')
})

test('context warns earlier than the rate windows', () => {
  expect(colorFor(35, 30, 50)).toBe('warning')
  expect(colorFor(35)).toBe('success')
  expect(colorFor(85)).toBe('error')
})

test('billing comes from the rate-limit windows', () => {
  expect(planOf([{}], true)).toBe('subscription')
  expect(planOf([], true)).toBe('api')
  expect(planOf([], false)).toBe('unknown')
})

test('reads a live Gemini dispatch and nothing when idle', () => {
  expect(parseGemini('')).toBe(null)
  const g = parseGemini('run\t21\t3.7-flash-high -y · #34 · replace_file_content Header.tsx 6s · 4m12s · tok:▰▰▱▱▱▱▱▱▱▱ 206.7k / 1M\n')
  expect(g).toEqual({ isSlow: false, pct: 21, model: '3.7-flash-high -y', step: '#34', doing: 'replace_file_content Header.tsx 6s', elapsed: '4m12s', tokens: '206.7k / 1M' })
  expect(parseGemini('slow\t\tclaude-x · #2 · 10s')?.pct).toBe(null)
})

test('speaks the language set for the braves toolbox, Spanish when unset', () => {
  expect(langOf('{"language":"en"}')).toBe('en')
  expect(langOf('{"language":"es"}')).toBe('es')
  expect(langOf('{}')).toBe('es')
  expect(langOf('')).toBe('es')
})

test('reads the plan from claude auth status', () => {
  expect(accountOf('{"authMethod":"claude.ai","subscriptionType":"pro"}', '/u')).toEqual({ isSubscription: true, plan: 'Claude Pro', home: '/u' })
  expect(accountOf('{"authMethod":"api_key"}', '/u')?.plan).toBe('API')
  expect(accountOf('', '/u')).toBe(null)
  expect(tildePath('/u/x/y', '/u')).toBe('~/x/y')
  expect(tildePath('/other', '/u')).toBe('/other')
})

test('the ticker stands still when it fits and loops when it does not', () => {
  const text = (r: { text: string }[]) => r.map(x => x.text).join('')
  expect(text(marquee([{ text: 'hola', color: 'red' }], 10, 5))).toBe('hola')
  expect(marquee([], 10, 0)).toEqual([])
  const long = [{ text: 'abcdef', color: 'red' }, { text: 'xyz' }]
  expect(text(marquee(long, 8, 0))).toBe('abcdef  ')
  expect(text(marquee(long, 8, 23))).toBe('abcdef  ')
  expect(marquee(long, 8, 0)[0]).toEqual({ text: 'abcdef', color: 'red' })
})
