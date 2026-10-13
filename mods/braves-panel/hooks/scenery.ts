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
    sky: ['#0b1026', '#0f1838', '#141e45', '#18234f'],
    layers: [
      { rows: ['   ·        ●         ·    ✦     ·  ', '        ·                           ', '                                    ', '                                    '], speed: 0, color: '#c9d1ff', ink: { '●': '#f5f3ce' } },
      { rows: ['                ▗▖                  ', '   ▄▄      ▗▄▄  ██   ▄▄▄       ▗▄    ', '  ▐██▌ ▄▄  ███▌ ██  ▐███▌ ▄▄   ██▌   ', '  ▐██▌▐██▌ ███▌ ██  ▐███▌▐██▌  ██▌   '], speed: 1, color: '#55679f' },
      { rows: ['      ▄       ◆           ▄▄       ', ' ▐▀▀▌ █   ▐▀▀▀▀▌      ▐▀▀▀▌██  ▐▀▌  ', ' ▐▪▫▌ █▪  ▐▪▫▪▪▌  ▄▄  ▐▪▪▫▌▪█  ▐▪▌  ', ' ▐▫▪▌ █▫  ▐▪▪▫▪▌ ▐▪▪▌ ▐▫▪▪▌▫█  ▐▪▌  '], speed: 4, color: '#8a93bd', ink: { '▪': '#ffd166', '▫': '#ffd166', '◆': '#ff4fd8' } },
    ],
    ground: { tile: '▬▬▬   ▬▬▬   ', color: '#f2c14e', bg: '#2a2d36' },
  },
  // A park at sunset: the sun sinking behind purple hills, birds, trees and lamps going by.
  park: {
    sky: ['#3a2560', '#6a3a78', '#a04a78', '#e07a6a'],
    layers: [
      { rows: ['                ◖◗                    ', '                                      ', '                                      ', '                                      '], speed: 0, color: '#ffe08a' },
      { rows: ['                                      ', '         ᵛ               ᵛ ᵛ          ', '                                      ', '▂▃▄▅▅▄▃▂▁    ▁▂▃▄▃▂▁      ▂▃▄▅▆▅▄▃▂▁▁  '], speed: 2, color: '#5a2f5f', ink: { ᵛ: '#1a1020' } },
      { rows: ['   ▄██▄          ●          ▄▄       ', '  ▐████▌         ╿         ▟██▙      ', '   ▀██▀    ✿     ╿    ✿   ▜██▛    ✿ ', '    ▕▏           ╿          ▕▏       '], speed: 4, color: '#7ccf60', ink: { '▕': '#3e2416', '▏': '#3e2416', '●': '#ffd88a', '╿': '#15151c', '✿': '#fff1a8' } },
    ],
    ground: { tile: '▁ ▁  ▁   ▁ ', color: '#f0d6b0', bg: '#6a4a38' },
  },
  // A field by day: clouds drifting, green hills, a fence and wheat swaying past.
  field: {
    sky: ['#1f6fb8', '#3388cf', '#7cbde8', '#b5dcf3'],
    layers: [
      { rows: ['   ▗▄▄▖           ☀            ▗▄▖   ', '  ▀▀▀▀▀▀                     ▀▀▀▀▀  ', '                                      ', '                                      '], speed: 1, color: '#ffffff', ink: { '☀': '#ffd23f' } },
      { rows: ['                                      ', '                                      ', '        ▁▂▃▃▂▁          ▁▂▂▁          ', '▁▂▃▄▄▃▂▂▃▄▅▅▄▃▂▁▁▂▃▄▄▃▂▃▄▅▅▅▄▃▂▁▁▁▂▂▁  '], speed: 2, color: '#3a7a2a' },
      { rows: ['                                      ', '  ┬─┬─┬─┬              ψ ψ           ', '  │ │ │ │     ψ ψ ψ   ψψψψψ   ψ ψ    ', '  │ │ │ │    ψψψψψψ  ψψψψψψψ ψψψψψ   '], speed: 4, color: '#5a3f22', ink: { ψ: '#7a4a05' } },
    ],
    ground: { tile: 'ʷ  ʷʷ   ʷ  ', color: '#b8eb80', bg: '#3f7a2e' },
  },
  // Mountains at dawn: snowy peaks far away, pines and a river close by.
  nature: {
    sky: ['#3b2d6e', '#a8709a', '#eba08a', '#ffd6a5'],
    layers: [
      { rows: ['  ·        ▲              ▲          ', '          ▟▲▙       ▲    ▟▲▙         ', '        ▗▟███▙▖    ▟█▙  ▟███▙▖       ', '     ▗▄▟███████▙▄▄▟███▙▟███████▙▄▖   '], speed: 1, color: '#3a3358', ink: { '▲': '#f0f0f5', '·': '#ffe6c7' } },
      { rows: ['                                     ', '    ▲          ▲▲           ▲         ', '   ▟█▙   ▲    ▟██▙    ▲    ▟█▙   ▲    ', '  ▟███▙ ▟█▙  ▟████▙  ▟█▙  ▟███▙ ▟█▙   '], speed: 2, color: '#1a4030' },
      { rows: ['                                     ', '                       ▲             ', '  ▲                   ▟█▙        ≈≈   ', ' ▟█▙   ≈≈≈≈          ▟███▙   ≈≈≈≈≈≈≈  '], speed: 4, color: '#16382a', ink: { '≈': '#1f5fc0' } },
    ],
    ground: { tile: '░ ░░  ░ ', color: '#c9a27a', bg: '#4a3628' },
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
