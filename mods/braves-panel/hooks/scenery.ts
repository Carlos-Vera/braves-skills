// Backdrops for the task sprint: the mascot jogs in place while one of these
// scrolls past behind it. Each paints a sky (a background color per row, a
// gradient), then layers from far to near: the far ones crawl, the near one
// rushes by, so the scene has depth. A layer is a tile of 4 rows that repeats
// sideways; a space lets what is behind it show. Some characters animate:
// stars twinkle, windows go dark and light up, wheat sways.
//
// Below the stage the ground runs at the near layer's pace.

export type Cell = { ch: string; color?: string; bg?: string }

type Layer = {
  rows: readonly string[]
  // Columns the tile moves per 4 steps of the trek: 1 is far, 4 is near.
  speed: number
  color: string
  ink?: Readonly<Record<string, string>>
}

type Backdrop = {
  sky: readonly string[]
  layers: readonly Layer[]
  ground: { tile: string; color: string; bg: string }
}

export const BACKDROPS = {
  // A city at night: a moon and twinkling stars, a far skyline, lit windows rushing past.
  city: {
    sky: ['#0b1026', '#111a3d', '#18234f', '#202d5e'],
    layers: [
      { rows: ['   ·        ●         ·    ✦     ·  ', '        ·                           ', '                                    ', '                                    '], speed: 0, color: '#c9d1ff', ink: { '●': '#f5f3ce' } },
      { rows: ['                ▗▖                  ', '   ▄▄      ▗▄▄  ██   ▄▄▄       ▗▄    ', '  ▐██▌ ▄▄  ███▌ ██  ▐███▌ ▄▄   ██▌   ', '  ▐██▌▐██▌ ███▌ ██  ▐███▌▐██▌  ██▌   '], speed: 1, color: '#2c3a6b' },
      { rows: ['      ▄       ◆           ▄▄       ', ' ▐▀▀▌ █   ▐▀▀▀▀▌      ▐▀▀▀▌██  ▐▀▌  ', ' ▐▪▫▌ █▪  ▐▪▫▪▪▌  ▄▄  ▐▪▪▫▌▪█  ▐▪▌  ', ' ▐▫▪▌ █▫  ▐▪▪▫▪▌ ▐▪▪▌ ▐▫▪▪▌▫█  ▐▪▌  '], speed: 4, color: '#3d4466', ink: { '▪': '#ffd166', '▫': '#ffd166', '◆': '#ff4fd8' } },
    ],
    ground: { tile: '▬▬▬   ▬▬▬   ', color: '#f2c14e', bg: '#2a2d36' },
  },
  // A park at sunset: the sun sinking behind purple hills, birds, trees and lamps going by.
  park: {
    sky: ['#ffb36b', '#f58a73', '#d06a83', '#8a5a8f'],
    layers: [
      { rows: ['                ◖◗                    ', '                                      ', '                                      ', '                                      '], speed: 0, color: '#ffe08a' },
      { rows: ['                                      ', '         ᵛ               ᵛ ᵛ          ', '                                      ', '▂▃▄▅▅▄▃▂▁    ▁▂▃▄▃▂▁      ▂▃▄▅▆▅▄▃▂▁▁  '], speed: 2, color: '#5a3d6b', ink: { ᵛ: '#3a2a3f' } },
      { rows: ['   ▄██▄          ●          ▄▄       ', '  ▐████▌         ╿         ▟██▙      ', '   ▀██▀    ✿     ╿    ✿   ▜██▛    ✿ ', '    ▐▌           ╿          ▐▌       '], speed: 4, color: '#2f6b3a', ink: { '▐': '#7a5236', '▌': '#7a5236', '●': '#ffd88a', '╿': '#4a4a55', '✿': '#ff6fa8' } },
    ],
    ground: { tile: '▁ ▁  ▁   ▁ ', color: '#c9a27a', bg: '#7a5a46' },
  },
  // A field by day: clouds drifting, green hills, a fence and wheat swaying past.
  field: {
    sky: ['#4aa3e0', '#6db8eb', '#97cdf2', '#c3e4f7'],
    layers: [
      { rows: ['   ▗▄▄▖           ☀            ▗▄▖   ', '  ▀▀▀▀▀▀                     ▀▀▀▀▀  ', '                                      ', '                                      '], speed: 1, color: '#ffffff', ink: { '☀': '#ffd23f' } },
      { rows: ['                                      ', '                                      ', '        ▁▂▃▃▂▁          ▁▂▂▁          ', '▁▂▃▄▄▃▂▂▃▄▅▅▄▃▂▁▁▂▃▄▄▃▂▃▄▅▅▅▄▃▂▁▁▁▂▂▁  '], speed: 2, color: '#5f9e4a' },
      { rows: ['                                      ', '  ┬─┬─┬─┬              ψ ψ           ', '  │ │ │ │     ψ ψ ψ   ψψψψψ   ψ ψ    ', '  │ │ │ │    ψψψψψψ  ψψψψψψψ ψψψψψ   '], speed: 4, color: '#8a6a45', ink: { ψ: '#e8b93a' } },
    ],
    ground: { tile: 'ʷ  ʷʷ   ʷ  ', color: '#2f6b2a', bg: '#4f8a3a' },
  },
  // Mountains at dawn: snowy peaks far away, pines and a river close by.
  nature: {
    sky: ['#2d1b4e', '#6b3a6e', '#c86b6b', '#f2b880'],
    layers: [
      { rows: ['  ·        ▲              ▲          ', '          ▟▲▙       ▲    ▟▲▙         ', '        ▗▟███▙▖    ▟█▙  ▟███▙▖       ', '     ▗▄▟███████▙▄▄▟███▙▟███████▙▄▖   '], speed: 1, color: '#4a4e69', ink: { '▲': '#f0f0f5', '·': '#ffe6c7' } },
      { rows: ['                                     ', '    ▲          ▲▲           ▲         ', '   ▟█▙   ▲    ▟██▙    ▲    ▟█▙   ▲    ', '  ▟███▙ ▟█▙  ▟████▙  ▟█▙  ▟███▙ ▟█▙   '], speed: 2, color: '#1f4d3a' },
      { rows: ['                                     ', '                       ▲             ', '  ▲                   ▟█▙        ≈≈   ', ' ▟█▙   ≈≈≈≈          ▟███▙   ≈≈≈≈≈≈≈  '], speed: 4, color: '#16382a', ink: { '≈': '#6ec6ff' } },
    ],
    ground: { tile: '░ ░░  ░ ', color: '#8a6a4a', bg: '#5b4636' },
  },
} satisfies Record<string, Backdrop>

export type BackdropName = keyof typeof BACKDROPS
export const BACKDROP_ORDER = Object.keys(BACKDROPS) as BackdropName[]

// ponytail: a cheap per-cell coin, stable for a stretch of time, for twinkling and windows.
const coin = (col: number, beat: number) => ((col * 7919 + beat * 104729) % 97) / 97

/** What a character draws at `col` on `beat`: stars and windows blink, wheat sways. */
function animate(ch: string, col: number, beat: number): string {
  if (ch === '·' || ch === '✦') return coin(col, beat) < 0.2 ? ' ' : ch
  if (ch === '▪' || ch === '▫') return coin(col, beat >> 2) < 0.15 ? ' ' : '▪'
  if (ch === 'ψ') return (col + beat) % 3 === 0 ? 'Ψ' : 'ψ'
  return ch
}

const tile = (row: string, len: number) => [...row.padEnd(len)]

/** The stage's 4 rows `width` wide, `trek` steps into the run. */
export function backdrop(name: BackdropName, width: number, trek: number): Cell[][] {
  const { sky, layers } = BACKDROPS[name] as Backdrop
  const beat = Math.floor(trek / 4)
  return sky.map((bg, r) => {
    const row: Cell[] = Array.from({ length: width }, () => ({ ch: ' ', bg }))
    for (const layer of layers) {
      const len = Math.max(...layer.rows.map(x => [...x].length))
      const chars = tile(layer.rows[r] ?? '', len)
      const offset = Math.floor((trek * layer.speed) / 4)
      for (let i = 0; i < width; i++) {
        const at = (offset + i) % len
        const ch = animate(chars[at]!, at, beat)
        if (ch !== ' ') row[i] = { ch, color: layer.ink?.[chars[at]!] ?? layer.color, bg }
      }
    }
    return row
  })
}

/** The ground under the stage, running at the near layer's pace. */
export function ground(name: BackdropName, width: number, trek: number): Cell[] {
  const { tile: t, color, bg } = (BACKDROPS[name] as Backdrop).ground
  const chars = [...t]
  return Array.from({ length: width }, (_, i) => ({ ch: chars[(trek + i) % chars.length]!, color, bg }))
}
