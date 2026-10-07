import { expect, test } from 'claude-code/testing'

import { ACTS, FRAMES, STAGE_COLUMNS, STAGE_ROWS, toRuns } from './mascot'
import type { Pose } from './mascot'

test('every pose is exactly 9 x 3 cells', () => {
  for (const rows of Object.values(FRAMES)) {
    expect(rows.length).toBe(STAGE_ROWS)
    expect(rows.every(r => [...r].length === STAGE_COLUMNS)).toBe(true)
  }
})

test('tools are steel, the body is teal, empty cells carry no color', () => {
  const runs = toRuns('hammer').flat()
  expect(runs.some(r => r.color === '#9aa3ad')).toBe(true)
  expect(runs.some(r => r.color === '#02c0b6')).toBe(true)
  expect(runs.filter(r => r.text.trim() === '').every(r => r.color === undefined)).toBe(true)
})

test('every act only names poses that exist', () => {
  for (const beats of Object.values(ACTS)) for (const [pose] of beats) expect(pose in FRAMES).toBe(true)
  expect(toRuns('default' as Pose).map(l => l.map(r => r.text).join(''))).toEqual([...FRAMES.default])
})

test('cooking draws the mascot with its arm up and a pot beside it, two frames apart', () => {
  const a = toRuns('default', 0).map(l => l.map(r => r.text).join(''))
  const b = toRuns('default', 1).map(l => l.map(r => r.text).join(''))
  expect(a.every(l => [...l].length === STAGE_COLUMNS - 1 + 7)).toBe(true)
  expect(a[0]!.startsWith(FRAMES.reach[0].slice(0, STAGE_COLUMNS - 1))).toBe(true)
  expect(a.join('') !== b.join('')).toBe(true)
  expect(toRuns('default', 0).flat().some(r => r.color === '#f59e0b' || r.bg === '#f59e0b')).toBe(true)
})
