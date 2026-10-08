// The braves mascot, drawn by Carlos in the Unicode Mascot Animator
// (uma.sujumayas.com) and imported into sprites.ts with tools/import-sprites.py.
// Poses are 9 x 3 cells of quadrant blocks; the laptop scenes are 13 x 3.

import { PALETTE, SEQUENCES, SPRITES } from './sprites'

export const STAGE_COLUMNS = 9
export const STAGE_ROWS = 3
export const TICK_MS = 100

export type Pose = keyof typeof SPRITES

/** A step in a short performance: show `pose` for `ms`. */
export type Beat = readonly [Pose, number]

const { work: WORK, ...acts } = SEQUENCES
/** The editor's timelines (hello, jump, celebrate, poke, idle, ...); `work` plays apart. */
export const ACTS: Record<keyof typeof acts, readonly Beat[]> = acts

// ── Working ─────────────────────────────────────────────────────────────────
// While Claude works the mascot loops its laptop routine: types, glances at the
// prompt, winks, scratches its head.
const WORK_MS = WORK.reduce((t, [, ms]) => t + ms, 0)
export const WORK_STEPS = WORK.length

/** Which routine step plays `ms` into the loop. */
export function workAt(ms: number): number {
  let t = ms % WORK_MS
  for (let i = 0; i < WORK.length; i++) {
    t -= WORK[i]![1]
    if (t < 0) return i
  }
  return 0
}

export type Run = { text: string; color?: string }

/** The sprite for `pose`, or with `work` set, that step of the laptop routine. */
export function toRuns(pose: Pose, work?: number): Run[][] {
  const { rows, ink } = SPRITES[work === undefined ? pose : WORK[work % WORK.length]![0]]
  return rows.map((line, r) => {
    const runs: Run[] = []
    ;[...line].forEach((text, c) => {
      const i = ink[r]![c]
      const color = i === undefined || i === ' ' ? undefined : PALETTE[Number(i)]
      const prev = runs.at(-1)
      if (prev && prev.color === color) prev.text += text
      else runs.push({ text, color })
    })
    return runs
  })
}
