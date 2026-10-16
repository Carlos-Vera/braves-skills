import { expect, test } from 'claude-code/testing'

import { ACTS, SCENES, STAGE_COLUMNS, STAGE_ROWS, mirror, toRuns, workAt, zoomed } from './mascot'
import type { Pose } from './mascot'
import { SEQUENCES, SPRITES } from './sprites'

test('every sprite is up to 4 rows (effects on top; toRuns pads shorter ones), 9 cells wide (13 for the work scenes), ink matching its characters', () => {
  for (const [name, { rows, ink }] of Object.entries(SPRITES)) {
    expect(rows.length).toBeLessThanOrEqual(STAGE_ROWS)
    const width = name.startsWith('work') || name.startsWith('desk') ? 13 : STAGE_COLUMNS
    expect(rows.every(r => [...r].length === width)).toBe(true)
    rows.forEach((r, i) => expect([...r].length).toBe(ink[i]!.length))
  }
})

test("Carlos's own default pose is kept as drawn", () => {
  expect([...SPRITES.default.rows].slice(1)).toEqual([' ▐▛███▜▌ ', ' ▜█████▛ ', '  ▆   ▆  '])
  // On the 4-row stage it stands on the floor, the effects row empty.
  expect(toRuns('default').map(l => l.map(r => r.text).join(''))).toEqual(['         ', ' ▐▛███▜▌ ', ' ▜█████▛ ', '  ▆   ▆  '])
})

test('the poses the panel names exist, and every timeline only names sprites that exist', () => {
  for (const pose of ['default', 'blink', 'look-left', 'look-right'] satisfies Pose[]) expect(pose in SPRITES).toBe(true)
  for (const act of ['hello', 'jump', 'celebrate', 'poke', 'idle'] as const) expect(act in ACTS).toBe(true)
  for (const steps of Object.values(SEQUENCES)) for (const [sprite] of steps) expect(sprite in SPRITES).toBe(true)
})

test('effects sit in the top row in their own color', () => {
  const top = toRuns('love-1')
  expect(top[0]!.some(r => r.text.includes('♥') && r.color === '#e5534b')).toBe(true)
})

test('empty cells carry no color, drawn ones do', () => {
  const runs = toRuns('default').flat()
  expect(runs.filter(r => r.text.trim() === '').every(r => r.color === undefined)).toBe(true)
  expect(runs.some(r => r.color === '#02c0b6')).toBe(true)
})

test('both work routines loop on their own durations', () => {
  for (const scene of ['laptop', 'desktop'] as const) {
    const steps = SCENES[scene]
    expect(steps.length > 1).toBe(true)
    const first = steps[0]![1]
    expect(workAt(0, scene)).toBe(0)
    expect(workAt(first - 1, scene)).toBe(0)
    expect(workAt(first, scene)).toBe(1)
    expect(toRuns('default', 0, scene).map(l => l.map(r => r.text).join(''))).toEqual([...SPRITES[steps[0]![0]].rows])
  }
})

test('every reaction the hooks can cue has an act', () => {
  for (const cue of ['thinking', 'point', 'lightbulb', 'facepalm', 'disappointed', 'excited', 'confetti', 'dizzy', 'meditate', 'sleep', 'love', 'angry', 'halo', 'neo']) expect(cue in ACTS).toBe(true)
})

test('a mirrored walk faces left, and mirroring twice gives the drawing back', () => {
  const walk = SPRITES['walk-1']
  expect(mirror(walk).rows[1]).toBe(' ▟▜██▛█▌ ')
  expect(mirror(mirror(walk))).toEqual({ rows: [...walk.rows], ink: [...walk.ink] })
})

test('the camera at scale 1 draws the sprite where it stands', () => {
  const at = (runs: { text: string }[][]) => runs.map(r => r.map(x => x.text).join(''))
  const flat = at(zoomed('default', 20, 3, 1, 4))
  const drawn = at(toRuns('default'))
  for (const r of [1, 2]) expect(flat[r]).toBe(`   ${drawn[r]}`.padEnd(20))
})
