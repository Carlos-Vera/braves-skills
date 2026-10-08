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

test('working: the mascot types on a side-view laptop, 13 cells wide, every frame different', () => {
  expect(WORK_FRAMES).toBeGreaterThanOrEqual(4)
  const frames = Array.from({ length: WORK_FRAMES }, (_, i) => toRuns('default', i).map(l => l.map(r => r.text).join('')))
  for (const f of frames) {
    expect(f.length).toBe(STAGE_ROWS)
    expect(f.every(l => [...l].length === 13)).toBe(true)
  }
  for (let i = 0; i < WORK_FRAMES; i++) expect(frames[i]!.join('') !== frames[(i + 1) % WORK_FRAMES]!.join('')).toBe(true)
  const runs = Array.from({ length: WORK_FRAMES }, (_, i) => toRuns('default', i).flat()).flat()
  for (const color of ['#02c0b6', '#9aa3ad', '#f0ece4']) expect(runs.some(r => r.color === color)).toBe(true)
})
