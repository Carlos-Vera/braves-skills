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
  'type-1': [' ▐█▜██▛▙ ', ' ▜█████▌ ', '  ▆   ▆  '],
  'type-2': [' ▐█▜██▛▌ ', ' ▜██████ ', '  ▆   ▆  '],
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

// ── Laptop Working ──────────────────────────────────────────────────────────
// While Claude works the mascot types on an open laptop seen from the side:
// a thin horizontal base extends left, the lid leans back at 45 degrees in
// steel, and code pixels scroll along the screen's left face.
// Drawn with the half-block renderer (two pixels per row, one per column).
const LAPTOP = [
  // Frame 0: code glows at y=0 (teal) and y=2 (light), y=3 (teal)
  [
    '......TS',
    '.....DS.',
    '....LS..',
    '...TS...',
    'SSSSS...',
    '.SSSS...',
  ],
  // Frame 1: code scrolls upward, new statement appears
  [
    '......DS',
    '.....TS.',
    '....DS..',
    '...LS...',
    'SSSSS...',
    '.SSSS...',
  ],
  // Frame 2: light token at top, teal code follows
  [
    '......LS',
    '.....DS.',
    '....TS..',
    '...TS...',
    'SSSSS...',
    '.SSSS...',
  ],
  // Frame 3: teal top, light sub-expression
  [
    '......TS',
    '.....LS.',
    '....DS..',
    '...LS...',
    'SSSSS...',
    '.SSSS...',
  ],
] as const

const WORK_POSES: readonly Pose[] = ['type-1', 'type-2', 'type-1', 'type-2']

export const WORK_FRAMES = LAPTOP.length
export const WORK_MS = 250

const LAPTOP_COLORS: Record<string, string> = {
  S: '#9aa3ad', // steel lid frame & keyboard base
  D: '#1c1c22', // dark screen background
  T: '#02c0b6', // teal code pixel
  L: '#f0ece4', // light code pixel
}

export type Run = { text: string; color?: string; bg?: string }

function push(runs: Run[], run: Run) {
  const prev = runs.at(-1)
  if (prev && prev.color === run.color && prev.bg === run.bg) prev.text += run.text
  else runs.push(run)
}

function laptopRow(px: readonly string[], r: number): Run[] {
  const runs: Run[] = []
  for (let c = 0; c < px[0]!.length; c++) {
    const top = LAPTOP_COLORS[px[2 * r]![c]!]
    const bottom = LAPTOP_COLORS[px[2 * r + 1]![c]!]
    push(runs, top === undefined && bottom === undefined ? { text: ' ' }
      : top === bottom ? { text: '█', color: top }
      : top === undefined ? { text: '▄', color: bottom }
      : { text: '▀', color: top, bg: bottom })
  }
  return runs
}

/** The mascot; with `work` set, typing on the laptop beside it. */
export function toRuns(pose: Pose, work?: number): Run[][] {
  if (work !== undefined) {
    const screen = LAPTOP[work % LAPTOP.length]!
    const mascotPose = WORK_POSES[work % WORK_POSES.length] ?? 'type-1'
    return FRAMES[mascotPose].map((line, r) => [...lineRuns(line.slice(0, STAGE_COLUMNS - 1)), ...laptopRow(screen, r)])
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
