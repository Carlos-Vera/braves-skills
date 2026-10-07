import { expect, test } from 'claude-code/testing'

import { ACTS, COOK_FRAMES, FRAMES, STAGE_COLUMNS, STAGE_ROWS, toRuns } from './mascot'
import type { Pose } from './mascot'

const ALLOWED_CHARS = new Set([...' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█▆'])

test('every pose is exactly 9 x 3 cells', () => {
  for (const rows of Object.values(FRAMES)) {
    expect(rows.length).toBe(STAGE_ROWS)
    expect(rows.every(r => [...r].length === STAGE_COLUMNS)).toBe(true)
  }
})

test('all poses use only allowed characters and default pose is preserved byte-for-byte', () => {
  for (const rows of Object.values(FRAMES)) {
    for (const row of rows) {
      for (const ch of row) {
        expect(ALLOWED_CHARS.has(ch)).toBe(true)
      }
    }
  }
  expect(FRAMES.default).toEqual([' ▐▛███▜▌ ', ' ▜█████▛ ', '  ▆   ▆  '])
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

test('cooking has at least 4 distinct frames with stirring and flame flicker', () => {
  expect(COOK_FRAMES).toBeGreaterThanOrEqual(4)
  const frames = Array.from({ length: COOK_FRAMES }, (_, i) => toRuns('default', i).map(l => l.map(r => r.text).join('')))
  for (const f of frames) {
    expect(f.length).toBe(STAGE_ROWS)
    expect(f.every(l => [...l].length === STAGE_COLUMNS - 1 + 7)).toBe(true)
  }
  for (let i = 0; i < COOK_FRAMES; i++) {
    const next = (i + 1) % COOK_FRAMES
    expect(frames[i]!.join('') !== frames[next]!.join('')).toBe(true)
  }
  const runsAll = Array.from({ length: COOK_FRAMES }, (_, i) => toRuns('default', i).flat()).flat()
  expect(runsAll.some(r => r.color === '#f59e0b' || r.bg === '#f59e0b')).toBe(true)
  expect(runsAll.some(r => r.color === '#ef4444' || r.bg === '#ef4444')).toBe(true)
})
