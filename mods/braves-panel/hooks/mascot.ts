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
  stir: [' ▐█▜██▛█ ', ' ▜█████▙ ', '  ▆   ▆  '],
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

// ── Cooking ─────────────────────────────────────────────────────────────────
// While Claude works the mascot stirs a pot beside it: its arm pumps with the
// spoon, steam rises and fades, and flames flicker. The pot is drawn at one
// pixel per column and two per row (half blocks).
const POT = [
  // Frame 0: spoon dips left, steam right, flames bright
  [
    'W....S.',
    '.W..S..',
    '..W....',
    '.RWRRRR',
    '.PPPPPP',
    '..F.f.F',
  ],
  // Frame 1: spoon moves center, steam rises high, flame flickers
  [
    'W.....S',
    '..W.S..',
    '...W...',
    '.RRWRRR',
    '.PPPPPP',
    '.f.F.f.',
  ],
  // Frame 2: spoon dips right, steam mid, flames dance
  [
    'W...S..',
    '..W..S.',
    '....W..',
    '.RRRWRR',
    '.PPPPPP',
    '..f.F.f',
  ],
  // Frame 3: spoon sweeps back center, fresh steam puff, flame alternates
  [
    'W....S.',
    '.W.S...',
    '...W...',
    '.RRWRRR',
    '.PPPPPP',
    '.F.f.F.',
  ],
] as const

const COOK_POSES: readonly Pose[] = ['reach', 'stir', 'stir', 'reach']

export const COOK_FRAMES = POT.length
export const COOK_MS = 300

const POT_COLORS: Record<string, string> = {
  W: '#be8e5c', // wooden spoon
  S: '#c9ced6', // steam
  R: '#9aa3ad', // rim
  P: '#5f6b7a', // pot
  F: '#f59e0b', // flame
  f: '#ef4444',
}

export type Run = { text: string; color?: string; bg?: string }

function push(runs: Run[], run: Run) {
  const prev = runs.at(-1)
  if (prev && prev.color === run.color && prev.bg === run.bg) prev.text += run.text
  else runs.push(run)
}

function potRow(px: readonly string[], r: number): Run[] {
  const runs: Run[] = []
  for (let c = 0; c < px[0]!.length; c++) {
    const top = POT_COLORS[px[2 * r]![c]!]
    const bottom = POT_COLORS[px[2 * r + 1]![c]!]
    push(runs, top === undefined && bottom === undefined ? { text: ' ' }
      : top === bottom ? { text: '█', color: top }
      : top === undefined ? { text: '▄', color: bottom }
      : { text: '▀', color: top, bg: bottom })
  }
  return runs
}

/** The mascot; with `cook` set, stirring the pot in that frame beside it. */
export function toRuns(pose: Pose, cook?: number): Run[][] {
  if (cook !== undefined) {
    const pot = POT[cook % POT.length]!
    const mascotPose = COOK_POSES[cook % COOK_POSES.length] ?? 'reach'
    // The reaching/stirring arm ends at column 7; the spoon continues from it into the pot.
    return FRAMES[mascotPose].map((line, r) => [...lineRuns(line.slice(0, STAGE_COLUMNS - 1)), ...potRow(pot, r)])
  }
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
