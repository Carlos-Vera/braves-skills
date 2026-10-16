// The braves mascot, drawn by Carlos in the Unicode Mascot Animator
// (uma.sujumayas.com) and imported into sprites.ts with tools/import-sprites.py.
// Poses are 9 x 3 cells of quadrant blocks (laptop scenes 13 x 3); some carry a
// fourth row on top for effects: hearts, z's, a question mark.

import { PALETTE, SEQUENCES, SPRITES } from './sprites'

export const STAGE_COLUMNS = 9
export const STAGE_ROWS = 4
// 50 so a 100 ms walk step is exactly two ticks (at 70 they alternated 70/140 and the legs shimmered).
export const TICK_MS = 50

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

export type Run = { text: string; color?: string; bg?: string }

type Drawn = { rows: readonly string[]; ink: readonly string[]; back?: readonly string[] }

// ponytail: the editor gives each cell one color, but a sunglasses arm is black over the teal face,
// so the arms are painted here: an upper half block in black over a teal cell background.
const ARMS = new Set<string>(['shades', 'shades-shine'])
function drawn(pose: Pose): Drawn {
  const { rows, ink } = SPRITES[pose]
  if (!ARMS.has(pose)) return { rows, ink }
  const at = (line: string, c: string, i: number) => [...line].map((ch, j) => (j === i || j === 8 - i ? c : ch)).join('')
  return {
    rows: rows.map((r, i) => (i === 1 ? at(r, '▀', 1) : r)),
    ink: ink.map((r, i) => (i === 1 ? at(r, '7', 1) : r)),
    back: rows.map((r, i) => (i === 1 ? at(' '.repeat([...r].length), '0', 1) : ' '.repeat([...r].length))),
  }
}

// Each quadrant block and its mirror image, so a sprite drawn facing right can face left.
const MIRROR: Record<string, string> = { '▐': '▌', '▌': '▐', '▛': '▜', '▜': '▛', '▙': '▟', '▟': '▙', '▘': '▝', '▝': '▘', '▖': '▗', '▗': '▖', '▞': '▚', '▚': '▞' }

/** A sprite flipped left to right: each row reversed, each block swapped for its mirror. */
export function mirror({ rows, ink, back }: Drawn) {
  const flip = (line: string) => [...line].reverse().join('')
  return { rows: rows.map(r => [...r].reverse().map(ch => MIRROR[ch] ?? ch).join('')), ink: ink.map(flip), ...(back && { back: back.map(flip) }) }
}

/** The sprite for `pose`, or with `work` set, that step of `scene`'s routine; `flip` faces it left. */
export function toRuns(pose: Pose, work?: number, scene: Scene = 'laptop', flip = false): Run[][] {
  const steps = SCENES[scene]
  const art = drawn(work === undefined ? pose : steps[work % steps.length]![0])
  const sprite = flip ? mirror(art) : art
  // Sprites without an effects row sit on the floor: an empty row on top keeps the stage still.
  const pad = STAGE_ROWS - sprite.rows.length
  const rows = [...Array<string>(pad).fill(' '), ...sprite.rows]
  const ink = [...Array<string>(pad).fill(' '), ...sprite.ink]
  const back = [...Array<string>(pad).fill(' '), ...(sprite.back ?? [])]
  return rows.map((line, r) => {
    const runs: Run[] = []
    ;[...line].forEach((text, c) => {
      const i = ink[r]![c]
      const color = i === undefined || i === ' ' ? undefined : PALETTE[Number(i)]
      const b = back[r]?.[c]
      const bg = b === undefined || b === ' ' ? undefined : PALETTE[Number(b)]
      const prev = runs.at(-1)
      if (prev && prev.color === color && prev.bg === bg) prev.text += text
      else runs.push(bg ? { text, color, bg } : { text, color })
    })
    return runs
  })
}

// ── Camera ──────────────────────────────────────────────────────────────────
// Each quadrant block as its four pixels (top-left, top-right, bottom-left, bottom-right);
// legs and other partial blocks count as their nearest quadrants, effects glyphs drop out.
const QUADS = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█'
const BITS: Record<string, number> = { ...Object.fromEntries([...QUADS].map((ch, i) => [ch, i])), '▆': 12, '▅': 12, '▂': 12, '▁': 12, '▃': 12, '▇': 15 }

// The eyes on the 18 x 8 pixel grid of a padded sprite: between the two notches of the face row.
const EYES = { x: 9, y: 3.5 }

/**
 * The stage `across` cells wide with the camera zoomed `scale` times on the mascot's eyes.
 * At scale 1 it matches the sprite drawn at column `x`; as the scale grows the eyes slide to the
 * middle of the stage. Nearest-pixel sampling: the quadrant blocks are the pixels.
 */
export function zoomed(pose: Pose, across: number, x: number, scale: number, top: number, lens?: number): Run[][] {
  const base = drawn(lens !== undefined ? 'default' : pose)
  const shades = lens !== undefined ? drawn('shades') : undefined
  const sample = ({ rows, ink, back }: Drawn, px: number, py: number): string | undefined => {
    const pad = STAGE_ROWS - rows.length
    const r = Math.floor(py / 2) - pad
    const c = Math.floor(px / 2)
    const ch = [...(rows[r] ?? '')][c]
    if (ch === undefined) return undefined
    if (!((BITS[ch] ?? 0) >> ((py & 1) * 2 + (px & 1)) & 1)) {
      const b = back?.[r]?.[c]
      return b === undefined || b === ' ' ? undefined : PALETTE[Number(b)]
    }
    const i = [...ink[r]!][c]
    return i === undefined || i === ' ' ? undefined : PALETTE[Number(i)]
  }
  // Where the eyes land on screen: from where it stands toward the middle as the camera closes in.
  const k = (scale - 1) / Math.max(1, top - 1)
  const ax = (2 * x + EYES.x) * (1 - k) + across * k
  const ay = EYES.y * (1 - k) + STAGE_ROWS * k
  return Array.from({ length: STAGE_ROWS }, (_, r) => {
    const runs: Run[] = []
    for (let c = 0; c < across; c++) {
      let bits = 0
      let color: string | undefined
      let bg: string | undefined
      for (let q = 0; q < 4; q++) {
        const ox = 2 * c + (q & 1) + 0.5
        const oy = 2 * r + (q >> 1) + 0.5
        const sx = EYES.x + (ox - ax) / scale
        const sy = EYES.y + (oy - ay) / scale
        const hit = shades && lens !== undefined && sample(shades, Math.floor(sx), Math.floor(sy + lens)) === PALETTE[7]
          ? PALETTE[7]
          : sample(base, Math.floor(sx), Math.floor(sy))
        color ??= hit
        // Two colors in a cell (the arms of the lenses): the first is the glyph, the other its background.
        if (hit && hit === color) bits |= 1 << q
        else if (hit) bg ??= hit
      }
      const text = QUADS[bits]!
      const prev = runs.at(-1)
      if (prev && prev.color === color && prev.bg === bg) prev.text += text
      else runs.push(bg ? { text, color, bg } : { text, color })
    }
    return runs
  })
}
