// Backdrops for the task sprint: the mascot jogs in place while one of these
// scrolls past behind it. Each is a 4-row tile that repeats sideways; a
// character's color comes from the scene's ink, its default color otherwise.

export type Cell = { ch: string; color?: string }

type Backdrop = { rows: readonly string[]; color: string; ink: Readonly<Record<string, string>> }

export const BACKDROPS = {
  city: {
    rows: [
      '     ▗▖           ▄          ',
      ' ▐█▌ ██▌  ▄▄   ▐██▌   ▐▌     ',
      ' ▐█▌ ██▌ ▐██▌  ▐██▌ ▐████▌   ',
      ' ▐█▌ ██▌ ▐██▌  ▐██▌ ▐████▌   ',
    ],
    color: '#4b5263',
    ink: {},
  },
  park: {
    rows: [
      '   ▄▄▄           ▄▄         ',
      '  ▐███▌    ✿    ▐██▌        ',
      '   ▝█▘   ▁▁▁     ▐▌    ✿    ',
      '    █    ╨ ╨     ▐▌         ',
    ],
    color: '#3f8f4f',
    ink: { '✿': '#e06c9f', '▁': '#9a7b55', '╨': '#9a7b55', '▐': '#9a7b55', '▌': '#9a7b55', '█': '#3f8f4f' },
  },
  field: {
    rows: [
      '            ◠              ',
      '                           ',
      '  ┬─┬─┬─┬     ʷ    ʷʷ      ',
      '  │ │ │ │   ʷʷ  ʷ     ʷ    ',
    ],
    color: '#9a7b55',
    ink: { '◠': '#f2c14e', ʷ: '#6bbf59' },
  },
  nature: {
    rows: [
      '      ▲            ▲        ',
      '     ▟█▙    ▲     ▟█▙       ',
      '    ▟███▙  ▟█▙   ▟███▙   ▲  ',
      '   ▟█████▙▟███▙ ▟█████▙ ▟█▙ ',
    ],
    color: '#5c7a6b',
    ink: { '▲': '#d8dee9' },
  },
} satisfies Record<string, Backdrop>

export type BackdropName = keyof typeof BACKDROPS
export const BACKDROP_ORDER = Object.keys(BACKDROPS) as BackdropName[]

/** `width` cells of each row of `name`, scrolled `offset` cells to the left. */
export function backdrop(name: BackdropName, width: number, offset: number): Cell[][] {
  const { rows, color, ink } = BACKDROPS[name] as Backdrop
  const len = Math.max(...rows.map(r => [...r].length))
  return rows.map(row => {
    const chars = [...row.padEnd(len)]
    return Array.from({ length: width }, (_, i) => {
      const ch = chars[(offset + i) % chars.length]!
      return ch === ' ' ? { ch } : { ch, color: ink[ch] ?? color }
    })
  })
}
