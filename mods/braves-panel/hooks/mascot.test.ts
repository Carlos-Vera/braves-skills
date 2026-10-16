import { expect, test } from 'claude-code/testing'

import { ACTS, KNEEL, SCENES, STAGE_COLUMNS, STAGE_ROWS, mirror, toRuns, workAt, zoomed } from './mascot'
import type { Pose } from './mascot'
import { PALETTE, SEQUENCES, SPRITES } from './sprites'

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

test('the sunglasses frame (arms and bridge) is a black line across the teal face, on both sides and in the zoom', () => {
  const arms = (runs: { text: string; color?: string; bg?: string }[]) => runs.filter(r => r.bg).map(r => [r.text, r.color, r.bg])
  const [teal, black] = [PALETTE[0], PALETTE[7]]
  const frame = [['━', black, teal], ['━', black, teal], ['━', black, teal]]
  expect(arms(toRuns('shades')[1]!)).toEqual(frame)
  expect(arms(toRuns('shades', undefined, 'laptop', true)[1]!)).toEqual(frame)
  expect(arms(toRuns('default')[1]!)).toEqual([])
  // Close up, the line still crosses the bridge between the lenses: a row black from edge to edge.
  expect(zoomed('shades', 24, 4, 4, 4).some(row => row.every(r => r.color === black))).toBe(true)
})

test('zoomed with lens 0 equals zoomed shades, and with lens > 0 sits higher', () => {
  expect(zoomed('default', 9, 0, 4, 4, 0)).toEqual(zoomed('shades', 9, 0, 4, 4))
  expect(zoomed('default', 9, 0, 1, 4, 0)).toEqual(zoomed('shades', 9, 0, 1, 4))
  const eyeRow = zoomed('default', 9, 0, 1, 4, 2)[1]!
  expect(eyeRow.some(r => r.color === PALETTE[7])).toBe(false)
  const topRow = zoomed('default', 9, 0, 1, 4, 2)[0]!
  expect(topRow.some(r => r.color === PALETTE[7])).toBe(true)
})

test('both kneel frames are 4 rows x 9 cells with ink/back matching, an empty top row, and differ only in the body lifting', () => {
  for (const { rows, ink, back } of Object.values(KNEEL)) {
    expect(rows.length).toBe(STAGE_ROWS)
    rows.forEach((r, i) => {
      expect([...r].length).toBe(STAGE_COLUMNS)
      expect(ink[i]!.length).toBe(STAGE_COLUMNS)
      expect(back![i]!.length).toBe(STAGE_COLUMNS)
    })
    expect(rows[0]!.trim()).toBe('')
  }
  const [a, b] = [KNEEL['neo-kneel'], KNEEL['neo-kneel-2']]
  expect(b.rows.slice(0, 3)).toEqual(a.rows.slice(0, 3))
  expect(b.rows[3]).not.toBe(a.rows[3])
})
