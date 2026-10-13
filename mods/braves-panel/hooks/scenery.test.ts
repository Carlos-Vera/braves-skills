import { expect, test } from 'claude-code/testing'

import { BACKDROP_ORDER, backdrop, ground } from './scenery'

test('every backdrop paints 4 rows of sky at any width, and its near layer moves faster than its far one', () => {
  for (const name of BACKDROP_ORDER) {
    const a = backdrop(name, 50, 0)
    expect(a.length).toBe(4)
    expect(a.every(r => r.length === 50 && r.every(c => c.bg !== undefined))).toBe(true)
  }
  // The city's skyline (speed 1) has moved 1 column after 4 steps, its street (speed 4) 4.
  const shift = (trek: number, row: number) => backdrop('city', 60, trek)[row]!.map(c => c.ch).join('')
  expect(shift(4, 2)).not.toBe(shift(0, 2))
})

test('the ground runs a cell per step', () => {
  const a = ground('field', 20, 0).map(c => c.ch)
  const b = ground('field', 20, 1).map(c => c.ch)
  expect(a.slice(1)).toEqual(b.slice(0, 19))
})
