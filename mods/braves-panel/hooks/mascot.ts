// The braves mascot: 9 x 3 cells of quadrant blocks, drawn by Carlos in the
// Unicode Mascot Animator (default pose); the other poses adapt it. Tools live
// alone in the last column so each cell keeps a single color.

export const STAGE_COLUMNS = 9
export const STAGE_ROWS = 3
export const TICK_MS = 100
const BODY = '#02c0b6'
const STEEL = '#9aa3ad'

export const FRAMES = {
  default: [' ▐▛███▜▌ ', ' ▜█████▛ ', '  ▆   ▆  '],
  blink: [' ▐█████▌ ', ' ▜█████▛ ', '  ▆   ▆  '],
  happy: [' ▐▙███▟▌ ', ' ▜█████▛ ', '  ▆   ▆  '],
  'look-left': [' ▐▜██▛█▌ ', ' ▜█████▛ ', '  ▆   ▆  '],
  'look-right': [' ▐█▜██▛▌ ', ' ▜█████▛ ', '  ▆   ▆  '],
  'arms-up': [' █▛███▜█ ', ' ▐█████▌ ', '  ▆   ▆  '],
  reach: [' ▐█▜██▛▙ ', ' ▜█████▌ ', '  ▆   ▆  '],
  hammer: [' ▐█▜██▛▙▜', ' ▜█████▌▐', '  ▆   ▆  '],
  wrench: [' ▐█▜██▛▙▙', ' ▜█████▌▐', '  ▆   ▆  '],
  hop: [' ▟▙███▟▙ ', ' ▝█▀▀▀█▘ ', '         '],
} as const

export type Pose = keyof typeof FRAMES

/** A step in a short performance: show `pose` for `ms`. */
export type Beat = [Pose, number]

export const ACTS = {
  hello: [['arms-up', 600], ['happy', 700]],
  jump: [['hop', 220], ['default', 120], ['happy', 600]],
  celebrate: [['arms-up', 500], ['default', 150], ['arms-up', 500], ['happy', 900]],
  wrench: [['reach', 250], ['wrench', 1100], ['reach', 200]],
  hammer: [['reach', 250], ['hammer', 1100], ['reach', 200]],
  poke: [['hop', 200], ['happy', 700]],
  // Idle routine, paced like a look around the room.
  idle: [['default', 800], ['look-left', 1000], ['default', 300], ['look-right', 1000], ['default', 300], ['arms-up', 1200], ['default', 400]],
} satisfies Record<string, Beat[]>

// ── Working ─────────────────────────────────────────────────────────────────
// While Claude works the mascot sits at a laptop seen from the side (a flat
// base reaching back to it, the lid leaning away from the hinge) and goes
// through a little routine: types, stops to glance down-left at what you are
// writing, winks, goes back to typing, now and then scratches its head.
// Drawn on the same 2x2 sub-pixel grid as the mascot: 13 cells, 26 x 6.
const LID = ['........S', '.......S.', '.......S.', '......S..', 'SSSSSSS..', '.........']
const LEGS = ['....TT......TT..S', '....TT......TT...']

type Arm = 'up' | 'down' | 'head' | 'head2'
type Eyes = 'laptop' | 'prompt' | 'wink' | 'up'

// Where each eye's gap goes, [row, columns]: the laptop is to the right, the
// prompt below-left, `up` is the thinking look.
const EYES: Record<Eyes, [number, number[]]> = {
  laptop: [1, [6, 13]],
  prompt: [2, [4, 11]],
  wink: [2, [4]],
  up: [0, [5, 12]],
}

function scene(arm: Arm, eyes: Eyes, glow?: number): string[] {
  const m = ['...TTTTTTTTTTTT..', '...TTTTTTTTTTTT..', '..TTTTTTTTTTTTT..', '...TTTTTTTTTTTT..'].map(r => [...r])
  const on = (r: number, c: number) => (m[r]![c] = 'T')
  if (arm === 'up') on(2, 15), on(2, 16)
  if (arm === 'down') on(3, 15), on(3, 16)
  if (arm === 'head') on(0, 15), on(1, 15)
  if (arm === 'head2') on(0, 15), on(0, 16), on(1, 15)
  const [row, cols] = EYES[eyes]
  for (const c of cols) m[row]![c] = '.'
  const rows = [...m.map(r => r.join('')), ...LEGS].map((r, i) => r + LID[i]!)
  // The screen's glow, seen edge-on: a light pixel on the lid's inner face.
  if (glow !== undefined) rows[glow] = rows[glow]!.slice(0, 23) + 'L' + rows[glow]!.slice(24)
  return rows
}

const typing = (beats: number): [string[], number][] =>
  Array.from({ length: beats }, (_, i) => [scene(i % 2 ? 'down' : 'up', 'laptop', i % 3 === 2 ? undefined : i % 2), 220])
const scratching = (times: number): [string[], number][] =>
  Array.from({ length: times * 2 }, (_, i) => [scene(i % 2 ? 'head2' : 'head', 'up'), 160])

// ponytail: one fixed routine on a loop; randomize the order if it starts to feel scripted.
const ROUTINE: [string[], number][] = [
  ...typing(14),
  [scene('down', 'prompt'), 1400],
  [scene('down', 'wink'), 250],
  [scene('down', 'prompt'), 700],
  ...typing(12),
  [scene('down', 'prompt'), 900],
  ...typing(10),
  ...scratching(4),
  [scene('down', 'up'), 600],
  ...typing(14),
  [scene('down', 'prompt'), 1600],
]
const ROUTINE_MS = ROUTINE.reduce((t, [, ms]) => t + ms, 0)

/** Which routine step plays `ms` into the loop. */
export function workAt(ms: number): number {
  let t = ms % ROUTINE_MS
  for (let i = 0; i < ROUTINE.length; i++) {
    t -= ROUTINE[i]![1]
    if (t < 0) return i
  }
  return 0
}
export const WORK_STEPS = ROUTINE.length

const SCENE_COLORS: Record<string, string> = {
  T: '#02c0b6', // the mascot
  S: '#9aa3ad', // laptop
  L: '#f0ece4', // screen glow
}

const QUADS = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█'

/** Sub-pixel rows to cells: each cell is a quadrant char in its most common color. */
function quadRuns(px: readonly string[]): Run[][] {
  return Array.from({ length: px.length / 2 }, (_, r) => {
    const runs: Run[] = []
    for (let c = 0; c < px[0]!.length / 2; c++) {
      const cells = [px[2 * r]![2 * c]!, px[2 * r]![2 * c + 1]!, px[2 * r + 1]![2 * c]!, px[2 * r + 1]![2 * c + 1]!]
      const lit = cells.map(x => x !== '.')
      const counts = new Map<string, number>()
      for (const x of cells) if (x !== '.') counts.set(x, (counts.get(x) ?? 0) + 1)
      const top = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
      const ch = QUADS[(lit[0] ? 1 : 0) + (lit[1] ? 2 : 0) + (lit[2] ? 4 : 0) + (lit[3] ? 8 : 0)]!
      // The legs keep Carlos's ▆, a hair shorter than a full block.
      push(runs, { text: ch === '█' && top === 'T' && r === px.length / 2 - 1 ? '▆' : ch, color: top && SCENE_COLORS[top] })
    }
    return runs
  })
}

export type Run = { text: string; color?: string; bg?: string }

function push(runs: Run[], run: Run) {
  const prev = runs.at(-1)
  if (prev && prev.color === run.color && prev.bg === run.bg) prev.text += run.text
  else runs.push(run)
}

/** The mascot; with `work` set, typing on the laptop beside it. */
export function toRuns(pose: Pose, work?: number): Run[][] {
  if (work !== undefined) return quadRuns(ROUTINE[work % ROUTINE.length]![0])
  return FRAMES[pose].map(line => lineRuns(line))
}

function lineRuns(line: string): Run[] {
  const runs: Run[] = []
  ;[...line].forEach((ch, c) => {
    const color = ch === ' ' ? undefined : c === STAGE_COLUMNS - 1 ? STEEL : BODY
    push(runs, { text: ch, color })
  })
  return runs
}
