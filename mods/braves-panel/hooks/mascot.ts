// The braves mascot, drawn by Carlos in the Unicode Mascot Animator
// (uma.sujumayas.com) and imported into sprites.ts with tools/import-sprites.py.
// Poses are 9 x 3 cells of quadrant blocks (laptop scenes 13 x 3); some carry a
// fourth row on top for effects: hearts, z's, a question mark.

import { PALETTE, SEQUENCES, SPRITES } from './sprites'

export const STAGE_COLUMNS = 9
export const STAGE_ROWS = 4
// 50 so a 100 ms walk step is exactly two ticks (at 70 they alternated 70/140 and the legs shimmered).
export const TICK_MS = 50

export type NeoPose = 'neo-kneel' | 'neo-kneel-2'
export type LookPose = `look-${'up' | 'down'}${'' | '-left' | '-right'}`
export type Pose = keyof typeof SPRITES | NeoPose | LookPose | keyof typeof MORE

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

// Neo's three-point landing/launch stance: body low, one fist planted on the floor, one knee flat,
// sunglasses on. Frame 2 lifts the body off the floor by an eighth of a cell, for an energy-building tremble.
export const KNEEL: Record<NeoPose, Drawn> = {
  'neo-kneel': {
    rows: ['         ', '         ', '▝▀██▀██▀▘', '▗███████▄'],
    ink: ['         ', '         ', '777777777', '000000000'],
    back: ['         ', '         ', ' 0  0  0 ', '         '],
  },
  'neo-kneel-2': {
    rows: ['         ', '         ', '▝▀██▀██▀▘', '▗▇▇▇▇▇▇▇▄'],
    ink: ['         ', '         ', '777777777', '000000000'],
    back: ['         ', '         ', ' 0  0  0 ', '         '],
  },
}

// Its eyes are one-pixel notches in the face; looking up or down moves them a pixel. Raised eyes
// alone are the happy face, so looking up it also stands straight, arms down, craning its neck.
// The diagonals take look-left's and look-right's eyes up or down the same pixel.
const FACE_INK = ['         ', ' 0000000 ', ' 0000000 ', '  0   0  ']
const face = (top: string, bottom: string): Drawn => ({ rows: ['         ', top, bottom, '  ▆   ▆  '], ink: FACE_INK })
export const LOOK: Record<LookPose, Drawn> = {
  'look-up': face(' ▐▙███▟▌ ', ' ▐█████▌ '),
  'look-up-left': face(' ▐▟██▙█▌ ', ' ▐█████▌ '),
  'look-up-right': face(' ▐█▟██▙▌ ', ' ▐█████▌ '),
  'look-down': face(' ▐█████▌ ', ' ▜▙███▟▛ '),
  'look-down-left': face(' ▐█████▌ ', ' ▜▟██▙█▛ '),
  'look-down-right': face(' ▐█████▌ ', ' ▜█▟██▙▛ '),
}

// Poses drawn here until Carlos redraws them in the editor: sleepy eyes (two-pixel slits), a yawn,
// a stretch with eyes shut, a thumbs up, a drop of sweat, a whistle, a glance at a watch.
// Ink digits index PALETTE: 2 white, 3 yellow, 6 blue.
const at = (row: string, ink: string) => ({ rows: [row, ...FACE.slice(1)], ink: [ink, ...FACE_INK.slice(1)] })
const FACE = ['         ', ' ▐▛███▜▌ ', ' ▜█████▛ ', '  ▆   ▆  ']
// The sunglasses row (see drawn() below) and its teal background, for the poses here that wear them.
const GLASSES = { row: '▝▀██▀██▀▘', ink: '777777777', back: ' 0  0  0 ' }
// Swaying, its face a pixel off centre: the same glasses a pixel left (or right), the lens and
// bar edges falling inside cells (▜ ▛: bar on top, lens on one side, teal on the other).
const SWAY_GLASSES = { row: '▀▜█▛▜█▛▀ ', ink: '77777777 ', back: ' 0 00 0  ' }
const shaded = (rows: string[], ink: string[], g = GLASSES): Drawn => ({
  rows: rows.map((r, i) => (i === 1 ? g.row : r)),
  ink: ink.map((r, i) => (i === 1 ? g.ink : r)),
  back: rows.map((_, i) => (i === 1 ? g.back : '         ')),
})
const mirrored = (g: typeof GLASSES) => ({ row: ' ▀▜█▛▜█▛▀', ink: [...g.ink].reverse().join(''), back: [...g.back].reverse().join('') })
export const MORE = {
  // Neo in his sunglasses: the launch from the kneel, the punch up (the raised arm keeps its cells),
  // and a dance on Friday afternoons.
  'neo-hop': shaded(['         ', '', ' ▝█▀▀▀█▘ ', '         '], ['         ', '', ' 0000000 ', '         ']),
  'neo-punch': { rows: ['         ', '▝▀██▀██▙▞', ' ▜█████▌ ', '  ▆   ▆  '], ink: ['         ', '777777700', ' 0000000 ', '  0   0  '], back: ['         ', ' 0  0    ', '         ', '         '] },
  'dance-left': shaded(['         ', '', '▝██████▘ ', ' ▐▌  ▐▌  '], ['         ', '', '00000000 ', ' 00  00  '], SWAY_GLASSES),
  'dance-right': shaded(['         ', '', ' ▝██████▘', '  ▐▌  ▐▌ '], ['         ', '', ' 00000000', '  00  00 '], mirrored(SWAY_GLASSES)),
  'sleepy': face(' ▐▀███▀▌ ', ' ▜█████▛ '),
  'yawn': { rows: ['      o  ', ' ▐▀███▀▌ ', ' ▜█████▛ ', '  ▆   ▆  '], ink: ['      2  ', ...FACE_INK.slice(1)] },
  'yawn-2': { rows: ['      O  ', ' ▐▀███▀▌ ', ' ▜█████▛ ', '  ▆   ▆  '], ink: ['      2  ', ...FACE_INK.slice(1)] },
  'stretch': face(' ▜█████▛ ', ' ▐█████▌ '),
  'thumbs-up': { rows: ['        ▗', ' ▐▙███▟▙█', ' ▜█████▌ ', '  ▆   ▆  '], ink: ['        0', ' 00000000', ' 0000000 ', '  0   0  '] },
  'sweat-1': at('       ▖ ', '       6 '),
  'sweat-2': { rows: ['         ', ' ▐▛███▜▌▖', ' ▜█████▛ ', '  ▆   ▆  '], ink: ['         ', ' 00000006', ' 0000000 ', '  0   0  '] },
  'whistle': { rows: ['       ♪ ', ' ▐█▜██▛▌ ', ' ▜█████▛ ', '  ▆   ▆  '], ink: ['       2 ', ...FACE_INK.slice(1)] },
  'whistle-2': { rows: ['        ♫', ' ▐█▜██▛▌ ', ' ▜█████▛ ', '  ▆   ▆  '], ink: ['        2', ...FACE_INK.slice(1)] },
  // Scared of a dangerous command: hands over its eyes, knees together, a drop of sweat; cover-2 is
  // the same a column to the left, so swapping the two fast makes it tremble. Peeking between its
  // fingers, an ! over its head.
  'cover': { rows: ['       ▖ ', '▗▟█████▙▖', ' ▐█████▌ ', '   ▆ ▆   '], ink: ['       6 ', '000000000', ' 0000000 ', '   0 0   '] },
  'cover-2': { rows: ['      ▖  ', '▟█████▙▖ ', '▐█████▌  ', '  ▆ ▆    '], ink: ['      6  ', '00000000 ', '0000000  ', '  0 0    '] },
  'cover-peek': { rows: ['    !    ', '▗▟█▛█▜█▙▖', ' ▐█████▌ ', '   ▆ ▆   '], ink: ['    4    ', '000000000', ' 0000000 ', '   0 0   '] },
  // A magnifying glass (a white o on a raised arm) swept from side to side.
  'lupa-left': { rows: ['o        ', '▝▟▜██▛█▌ ', ' ▜█████▛ ', '  ▆   ▆  '], ink: ['2        ', '00000000 ', ...FACE_INK.slice(2)] },
  'lupa-right': { rows: ['        o', ' ▐█▜██▛▙▘', ' ▜█████▛ ', '  ▆   ▆  '], ink: ['        2', ' 00000000', ...FACE_INK.slice(2)] },
  // Pink cheeks: the top half of the cell under each eye pink over the teal body.
  'blush': { ...face(' ▐▙███▟▌ ', ' ▜▀███▀▛ '), ink: ['         ', ' 0000000 ', ' 0400040 ', '  0   0  '], back: ['         ', '         ', '  0   0  ', '         '] },
  'party': { rows: ['    ▲    ', ' ▐▙███▟▌ ', ' ▜█████▛ ', '  ▆   ▆  '], ink: ['    4    ', ...FACE_INK.slice(1)] },
  // Birthday: a pink cake on its head, the candle's flame (a yellow pixel) flickering left and right.
  'cake-1': { rows: ['  ▄▄▟▄▄  ', ' ▐▙███▟▌ ', ' ▜█████▛ ', '  ▆   ▆  '], ink: ['  44344  ', ...FACE_INK.slice(1)] },
  'cake-2': { rows: ['  ▄▄▙▄▄  ', ' ▐▙███▟▌ ', ' ▜█████▛ ', '  ▆   ▆  '], ink: ['  44344  ', ...FACE_INK.slice(1)] },
  // Three errors in a row: smoke rising off its angry head; then knocked flat on its back, seeing stars.
  'smoke-1': { rows: ['   ░ ▒   ', ' █▞███▚█ ', ' ▐█████▌ ', '  ▆   ▆  '], ink: ['   1 1   ', ...FACE_INK.slice(1)] },
  'smoke-2': { rows: ['  ▒ ░  ░ ', ' █▞███▚█ ', ' ▐█████▌ ', '  ▆   ▆  '], ink: ['  1 1  1 ', ...FACE_INK.slice(1)] },
  'knocked': { rows: ['  ✦  ·   ', '    ▃    ', ' █▟████  ', ' ██████▄▄'], ink: ['  3  2   ', '    0    ', ' 000000  ', ' 00000000'] },
  'knocked-2': { rows: ['  ·  ✦   ', '    ▃    ', ' █▟████  ', ' ██████▄▄'], ink: ['  2  3   ', '    0    ', ' 000000  ', ' 00000000'] },
  // Taking notes while Claude writes a plan: a white notebook in one hand, a yellow pencil over it.
  'notes-1': { rows: ['         ', ' ▐█████▌ ', ' ▜█▟██▙█▆', '  ▆   ▆  '], ink: ['         ', ' 0000000 ', ' 00000002', '  0   0  '] },
  'notes-2': { rows: ['         ', ' ▐█████▌▗', ' ▜█▟██▙█▆', '  ▆   ▆  '], ink: ['         ', ' 00000003', ' 00000002', '  0   0  '] },
  // A huge paste lands on it: a yellow box held overhead, wobbling.
  'box-1': { rows: ['  █████  ', ' ▜▛███▜▛ ', ' ▐█████▌ ', '  ▆   ▆  '], ink: ['  33333  ', ...FACE_INK.slice(1)] },
  'box-2': { rows: [' █████   ', ' ▜▛███▜▛ ', ' ▐█████▌ ', '  ▆   ▆  '], ink: [' 33333   ', ...FACE_INK.slice(1)] },
  'box-3': { rows: ['   █████ ', ' ▜▛███▜▛ ', ' ▐█████▌ ', '  ▆   ▆  '], ink: ['   33333 ', ...FACE_INK.slice(1)] },
  // A long turn late at night: a white mug of coffee instead of the sweat; it sips with sleepy eyes.
  'coffee-1': { rows: ['         ', ' ▐▛███▜▌~', ' ▜█████▙▆', '  ▆   ▆  '], ink: ['         ', ' 00000002', ' 00000002', '  0   0  '] },
  'coffee-2': { rows: ['        ~', ' ▐▀███▀▙▆', ' ▜█████▌ ', '  ▆   ▆  '], ink: ['        2', ' 00000002', ' 0000000 ', '  0   0  '] },
  // Fishing from where it sits: a grey rod, a white line down to the floor; the float bobs; a blue fish.
  'fish-1': { rows: ['        ▖', '       ▞│', ' ▐▛███▜▙│', ' ▜█████▛J'], ink: ['        1', '       12', ' 00000002', ' 00000002'] },
  'fish-2': { rows: ['        ▖', '       ▞│', ' ▐▛███▜▙J', ' ▜█████▛ '], ink: ['        1', '       12', ' 00000002', ' 0000000 '] },
  'fish-bite': { rows: ['    !   ▖', '       ▞│', ' ▐▛███▜▙│', ' ▜█████▛J'], ink: ['    4   1', '       12', ' 00000002', ' 00000002'] },
  'fish-catch': { rows: ['      ><>', ' ▐▙███▟▙▞', ' ▜█████▌ ', '  ▆   ▆  '], ink: ['      666', ' 00000001', ' 0000000 ', '  0   0  '] },
  // A sneeze: eyes squeezed shut (a slit at the top), body jolting forward.
  'sneeze': { rows: ['  * ·    ', ' ▐▄███▄▌ ', ' ▟█████▙ ', '  ▆   ▆  '], ink: ['  2 2    ', ...FACE_INK.slice(1)] },
  'watch': { rows: ['         ', ' ▐█████▌ ', ' ▜█▟██▙█▄', '  ▆   ▆  '], ink: ['         ', ' 0000000 ', ' 00000003', '  0   0  '] },
} satisfies Record<string, Drawn>

// The little helper that runs off with a subagent's job: two rows, two leg frames, drawn facing right.
export const MINI = [['▐▛▜▌', '▝▘▝▘'], ['▐▛▜▌', '▘▝▘▝']] as const

// What it carries past half its context: a backpack on its back, a size per band (50, 65, 80%),
// rows 1 and 2 of the column just behind it.
export const PACK = [['', '▐'], ['▗', '▐'], ['▟', '█']] as const
// December: a red hat on its head (row 0, columns 2 to 6) and a white bobble at column 7.
export const HAT = '▗▄▄▄▖•'

// ponytail: the editor gives each cell one color, but the frame of the sunglasses is black over the
// teal face, so the glasses row is painted here, like Clawd's: a bar along the top of the eye row,
// a pixel past the face each side, with the lenses hanging from it a full cell tall. The bar is the
// top half of its cells (▀ black over a teal cell background), so it lands on the pixel grid.
const ARMS = new Set<string>(['shades', 'shades-shine'])
function drawn(pose: Pose): Drawn {
  if (pose in KNEEL) return KNEEL[pose as NeoPose]
  if (pose in LOOK) return LOOK[pose as LookPose]
  if (pose in MORE) return MORE[pose as keyof typeof MORE]
  const { rows, ink } = SPRITES[pose as keyof typeof SPRITES]
  if (!ARMS.has(pose)) return { rows, ink }
  return {
    rows: rows.map((r, i) => (i === 1 ? '▝▀██▀██▀▘' : r)),
    ink: ink.map((r, i) => (i === 1 ? '777777777' : r)),
    back: rows.map((r, i) => (i === 1 ? ' 0  0  0 ' : ' '.repeat([...r].length))),
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
  // Landed (lens 0) is simply the shades pose; in flight, the lenses ride over the bare face.
  const base = drawn(lens === undefined ? pose : lens > 0 ? 'default' : 'shades')
  const shades = lens ? drawn('shades') : undefined
  type Hit = { color: string; back: boolean } | undefined
  const sample = ({ rows, ink, back }: Drawn, sx: number, sy: number): Hit => {
    const px = Math.floor(sx)
    const py = Math.floor(sy)
    const pad = STAGE_ROWS - rows.length
    const r = Math.floor(py / 2) - pad
    const c = Math.floor(px / 2)
    const ch = [...(rows[r] ?? '')][c]
    if (ch === undefined) return undefined
    const on = (BITS[ch] ?? 0) >> ((py & 1) * 2 + (px & 1)) & 1
    if (!on) {
      const b = back?.[r]?.[c]
      return b === undefined || b === ' ' ? undefined : { color: PALETTE[Number(b)]!, back: true }
    }
    const i = [...ink[r]!][c]
    return i === undefined || i === ' ' ? undefined : { color: PALETTE[Number(i)]!, back: false }
  }
  // Where the eyes land on screen: from where it stands toward the middle as the camera closes in.
  const k = (scale - 1) / Math.max(1, top - 1)
  const ax = (2 * x + EYES.x) * (1 - k) + across * k
  const ay = EYES.y * (1 - k) + STAGE_ROWS * k
  return Array.from({ length: STAGE_ROWS }, (_, r) => {
    const runs: Run[] = []
    for (let c = 0; c < across; c++) {
      const hits = [0, 1, 2, 3].map((q): Hit => {
        const sx = EYES.x + (2 * c + (q & 1) + 0.5 - ax) / scale
        const sy = EYES.y + (2 * r + (q >> 1) + 0.5 - ay) / scale
        const lensHit = shades && sample(shades, sx, sy + lens!)
        return lensHit?.color === PALETTE[7] && !lensHit.back ? lensHit : sample(base, sx, sy)
      })
      // Two colors in a cell (the frame of the glasses): the glyph takes the drawn color, the
      // background the cell-background color, as in the sprite itself.
      const color = (hits.find(h => h && !h.back) ?? hits.find(h => h))?.color
      let bits = 0
      let bg: string | undefined
      hits.forEach((h, q) => {
        if (h && h.color === color) bits |= 1 << q
        else if (h) bg ??= h.color
      })
      const text = QUADS[bits]!
      const prev = runs.at(-1)
      if (prev && prev.color === color && prev.bg === bg) prev.text += text
      else runs.push(bg ? { text, color, bg } : { text, color })
    }
    return runs
  })
}
