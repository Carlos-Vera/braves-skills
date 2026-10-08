import { expect, test } from 'claude-code/testing'

import { ACTS, FRAMES, STAGE_COLUMNS, STAGE_ROWS, WORK_FRAMES, toRuns } from './mascot'
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

test('typing poses differ by at least two cells while preserving body and legs', () => {
  const p1 = FRAMES['type-1']
  const p2 = FRAMES['type-2']
  expect(p1[2]).toBe(p2[2])
  expect(p1[0].slice(0, 7)).toBe(p2[0].slice(0, 7))
  expect(p1[1].slice(0, 7)).toBe(p2[1].slice(0, 7))
  let diffs = 0
  for (let r = 0; r < STAGE_ROWS; r++) {
    for (let c = 0; c < STAGE_COLUMNS; c++) {
      if (p1[r]?.[c] !== p2[r]?.[c]) diffs++
    }
  }
  expect(diffs).toBeGreaterThanOrEqual(2)
})

test('working draws the mascot typing on a laptop beside it, two frames apart', () => {
  const a = toRuns('default', 0).map(l => l.map(r => r.text).join(''))
  const b = toRuns('default', 1).map(l => l.map(r => r.text).join(''))
  expect(a.every(l => [...l].length === STAGE_COLUMNS - 1 + 8)).toBe(true)
  expect(a[0]!.startsWith(FRAMES['type-1'][0].slice(0, STAGE_COLUMNS - 1))).toBe(true)
  expect(a.join('') !== b.join('')).toBe(true)
})

test('laptop scene has at least 4 distinct frames with screen and code colors', () => {
  expect(WORK_FRAMES).toBeGreaterThanOrEqual(4)
  const frames = Array.from({ length: WORK_FRAMES }, (_, i) => toRuns('default', i).map(l => l.map(r => r.text).join('')))
  for (const f of frames) {
    expect(f.length).toBe(STAGE_ROWS)
    expect(f.every(l => [...l].length === STAGE_COLUMNS - 1 + 8)).toBe(true)
  }
  for (let i = 0; i < WORK_FRAMES; i++) {
    const next = (i + 1) % WORK_FRAMES
    expect(frames[i]!.join('') !== frames[next]!.join('')).toBe(true)
  }
  const runsAll = Array.from({ length: WORK_FRAMES }, (_, i) => toRuns('default', i).flat()).flat()
  expect(runsAll.some(r => r.color === '#9aa3ad' || r.bg === '#9aa3ad')).toBe(true)
  expect(runsAll.some(r => r.color === '#1c1c22' || r.bg === '#1c1c22')).toBe(true)
  expect(runsAll.some(r => r.color === '#02c0b6' || r.bg === '#02c0b6')).toBe(true)
  expect(runsAll.some(r => r.color === '#f0ece4' || r.bg === '#f0ece4')).toBe(true)
})
