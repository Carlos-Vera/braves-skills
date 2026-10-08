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

const { work, 'work-desktop': workDesktop, ...acts } = SEQUENCES
/** The editor's timelines (hello, jump, celebrate, poke, idle, ...); the work routines play apart. */
export const ACTS: Record<keyof typeof acts, readonly Beat[]> = acts

// ── Working ─────────────────────────────────────────────────────────────────
// While Claude works the mascot loops a routine at a laptop or at a desktop
// (one or the other per turn): types, glances at the prompt, winks, scratches its head.
export const SCENES = { laptop: work, desktop: workDesktop }
export type Scene = keyof typeof SCENES

/** Which step of `scene`'s routine plays `ms` into the loop. */
export function workAt(ms: number, scene: Scene = 'laptop'): number {
  const steps = SCENES[scene]
  let t = ms % steps.reduce((sum, [, d]) => sum + d, 0)
  for (let i = 0; i < steps.length; i++) {
    t -= steps[i]![1]
    if (t < 0) return i
  }
  return 0
}

export type Run = { text: string; color?: string }

/** The sprite for `pose`, or with `work` set, that step of `scene`'s routine. */
export function toRuns(pose: Pose, work?: number, scene: Scene = 'laptop'): Run[][] {
  const steps = SCENES[scene]
  const { rows, ink } = SPRITES[work === undefined ? pose : steps[work % steps.length]![0]]
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
