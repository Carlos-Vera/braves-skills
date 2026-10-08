import { expect, test } from 'claude-code/testing'

import { BACKDROP_ORDER, backdrop } from './scenery'

test('every backdrop is 4 rows that loop seamlessly at any width', () => {
  for (const name of BACKDROP_ORDER) {
    const a = backdrop(name, 50, 0)
    expect(a.length).toBe(4)
    expect(a.every(r => r.length === 50)).toBe(true)
    // Scrolling by one cell shifts every row by one.
    const b = backdrop(name, 50, 1)
    a.forEach((row, r) => expect(row.slice(1).map(c => c.ch)).toEqual(b[r]!.slice(0, 49).map(c => c.ch)))
  }
})
