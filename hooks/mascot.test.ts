import { expect, test } from 'claude-code/testing'

import { ACTS, STAGE_COLUMNS, STAGE_ROWS, WORK_STEPS, toRuns, workAt } from './mascot'
import type { Pose } from './mascot'
import { SEQUENCES, SPRITES } from './sprites'

test('every sprite is 3 rows, 9 cells wide (13 for the laptop scenes), ink matching its characters', () => {
  for (const [name, { rows, ink }] of Object.entries(SPRITES)) {
    expect(rows.length).toBe(STAGE_ROWS)
    const width = name.startsWith('work') ? 13 : STAGE_COLUMNS
    expect(rows.every(r => [...r].length === width)).toBe(true)
    rows.forEach((r, i) => expect([...r].length).toBe(ink[i]!.length))
  }
})

test("Carlos's own default pose is kept as drawn", () => {
  expect([...SPRITES.default.rows]).toEqual([' ▐▛███▜▌ ', ' ▜█████▛ ', '  ▆   ▆  '])
})

test('the poses the panel names exist, and every timeline only names sprites that exist', () => {
  for (const pose of ['default', 'blink', 'look-left', 'look-right'] satisfies Pose[]) expect(pose in SPRITES).toBe(true)
  for (const act of ['hello', 'jump', 'celebrate', 'poke', 'idle'] as const) expect(act in ACTS).toBe(true)
  for (const steps of Object.values(SEQUENCES)) for (const [sprite] of steps) expect(sprite in SPRITES).toBe(true)
})

test('empty cells carry no color, drawn ones do', () => {
  const runs = toRuns('default').flat()
  expect(runs.filter(r => r.text.trim() === '').every(r => r.color === undefined)).toBe(true)
  expect(runs.some(r => r.color === '#02c0b6')).toBe(true)
})

test('the laptop routine loops on its own durations', () => {
  expect(WORK_STEPS > 1).toBe(true)
  const first = SEQUENCES.work[0]![1]
  expect(workAt(0)).toBe(0)
  expect(workAt(first - 1)).toBe(0)
  expect(workAt(first)).toBe(1)
  expect(toRuns('default', 0).map(l => l.map(r => r.text).join(''))).toEqual([...SPRITES[SEQUENCES.work[0]![0]].rows])
})
