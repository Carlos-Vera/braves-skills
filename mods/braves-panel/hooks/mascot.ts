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
// While Claude works the mascot types on a laptop seen from the side: a flat
// base reaching back to it, the lid leaning away from the hinge, the screen's
// glow flickering on the lid's inner face. The right arm taps the keys.
// Drawn on the same 2x2 sub-pixel grid as the mascot: 13 cells, 26 x 6.
const ARM_UP = ['...TTTTTTTTTTTT..', '...TTT.TTTTTT.T..', '..TTTTTTTTTTTTTTT', '...TTTTTTTTTTTT..']
const ARM_DOWN = ['...TTTTTTTTTTTT..', '...TTT.TTTTTT.T..', '..TTTTTTTTTTTTT..', '...TTTTTTTTTTTTTT']
const LEGS = ['....TT......TT..S', '....TT......TT...']
const LID = ['........S', '.......S.', '.......S.', '......S..', 'SSSSSSS..', '.........']

/** One working frame: the arm up or down, and where the glow sits on the screen. */
function workFrame(arm: readonly string[], glow?: [number, number]): string[] {
  const rows = [...arm, ...LEGS].map((m, r) => m + LID[r]!)
  if (glow) {
    const [r, c] = glow
    rows[r] = rows[r]!.slice(0, c) + 'L' + rows[r]!.slice(c + 1)
  }
  return rows
}

const WORK = [
  workFrame(ARM_UP, [1, 23]),
  workFrame(ARM_DOWN, [0, 23]),
  workFrame(ARM_UP),
  workFrame(ARM_DOWN, [1, 23]),
]
export const WORK_FRAMES = WORK.length
export const WORK_MS = 220

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
  if (work !== undefined) return quadRuns(WORK[work % WORK.length]!)
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
