import type { ClientModule, RenderChildren } from 'claude-code'

import { BRAND, GEMINI_COLOR, LABEL, LABELS, bar, colorFor, fmtTokens, marquee } from './format'
import type { Run, View } from './format'
import type { News, Turn } from '../types'
import { ACTS, HAT, MINI, PACK, STAGE_COLUMNS, STAGE_ROWS, TICK_MS, toRuns, workAt, zoomed } from './mascot'
import type { Beat, Pose, Scene } from './mascot'
import { PALETTE } from './sprites'
import { BACKDROP_ORDER, backdrop, ground as groundRow } from './scenery'
import type { Cell } from './scenery'

// The whole panel draws here as a Client so the pointer anywhere over it
// reaches the mascot: it looks toward the pointer, a click makes it hop.

type State = { pose: Pose; queue: Beat[]; until: number; look: Pose; cue: number; blinkAt: number; idleAt: number; tool: number; work?: number; scene: Scene; wasWorking: boolean; restAt: number; reel: number; x: number; goal: number; gait: 'walk' | 'crab'; stepAt: number; trek: number; stride: number; lead: number; leadAt: number; rush: '' | 'point' | 'flee' | 'peek' | 'sit' | 'lift' | 'sleep'; seenAt: number; lift: number; liftAt: number; shy: boolean; waveAt: number; wave: number; zoomAt: number; zoom: number; lens?: number; busyAt: number; sweatAt: number; gem: boolean; mini: number; miniAt: number; flyer: 'mini' | 'plane'; mark: number }

let latest: View | undefined

// Pointing down-left at the ticker, once it got there.
const POINT: Beat[] = [['point-1', 300], ['point-2', 300], ['point-1', 250], ['point-2', 600], ['happy', 400]]

// Columns the work scenes take; the other poses take STAGE_COLUMNS.
const SCENE_COLUMNS = 13

// What it does when idle, in turn; walk and crab cross the stage instead of stepping in place.
// peek: walks half off one edge to look past it; sit: sits down at an edge for a while.
// ms per cell walked: a multiple of TICK_MS, or the steps come uneven.
const STEP_MS = 100
// Asleep on the floor: his lie frames breathing in and out (1 2 3 2), looped with no lying down in between.
const LIE = [...new Map(ACTS.sleep.map(b => [b[0], b])).values()]
const SNOOZE: Beat[] = [...LIE, ...LIE.slice(1, -1).reverse()]
// Neo's three-point landing/launch stance before flight: 700 ms tremble alternating every 100 ms.
const NEO_KNEEL: readonly Beat[] = [
  ['neo-kneel', 100],
  ['neo-kneel-2', 100],
  ['neo-kneel', 100],
  ['neo-kneel-2', 100],
  ['neo-kneel', 100],
  ['neo-kneel-2', 100],
  ['neo-kneel', 100],
]
// After the kneel his own frames (hop, punch, happy) in sunglasses, ending on the glint.
const NEO: readonly Beat[] = [...NEO_KNEEL, ['neo-hop', 180], ['neo-punch', 600], ['shades-shine', 400]]
// Before it: camera zooms on the eyes, sunglasses drop from above, glint, and camera pulls back.
const ZOOM = 4 // how close the camera gets
const ZOOM_MS = 400 // to close in, and to pull back
const DROP_MS = 700 // sunglasses drop onto eyes
const GLINT_MS = 300 // short shine glint
const LENS_START = 2 // source pixels above eyes, begins just out of frame at ZOOM
const INTRO: readonly Beat[] = [
  ['default', ZOOM_MS],
  ['default', DROP_MS],
  ['shades-shine', GLINT_MS],
  ['shades', ZOOM_MS],
]
const INTRO_MS = INTRO.reduce((t, b) => t + b[1], 0)
// The wave leaves with the punch: the first arms-up frame, after the crouch and the launch.
const NEO_WAVE = NEO.slice(0, Math.max(1, NEO.findIndex(b => b[0] === 'neo-punch'))).reduce((t, b) => t + b[1], 0)
const WAVE_MS = 700
// The least time between two waves: a calibration knob for how often it happens.
const NEO_GAP_MS = 5 * 60000
let neoAt = 0
// The data last drawn while idle, and the copy held from a turn's start until its wave has passed.
let lastIdle: View | undefined
let frozen: View | undefined
const IDLE = ['idle', 'peek', 'sway', 'turning', 'lift', 'halo', 'walk', 'sit', 'crab', 'wrench', 'hammer'] as const

// lift: at the left edge it sticks its face past the border to look into the code, comes out to
// nod its approval, looks once more and walks off. Each step: pose, ms, its column (negative: the
// face is past the edge).
// It leans like a person, from the hips with its feet planted: lean-2 and lean-3 are drawn one and
// two columns left of where it stands, right at the edge (its body touching column 0).
const LIFT: readonly (readonly [Pose, number, number])[] = [
  ['look-left', 500, -1], ['lean-1', 180, -1], ['lean-2', 180, -2], ['lean-3', 1100, -3], ['lean-2', 160, -2], ['lean-1', 160, -1],
  ['happy', 450, -1], ['blink', 150, -1], ['happy', 300, -1], ['blink', 150, -1], ['arms-up-one', 700, -1],
  ['lean-1', 160, -1], ['lean-2', 160, -2], ['lean-3', 900, -3], ['lean-2', 160, -2], ['lean-1', 160, -1], ['default', 300, -1],
]

// shy: the first time it ever meets you (a fresh install) it hides past the left edge, peeks one eye
// in, ducks back, peeks again with its eyes on the floor, then creeps in and dares a small wave.
// Same shape as LIFT; at -9 it is all the way off the stage.
const SHY: readonly (readonly [Pose, number, number])[] = [
  ['default', 900, -9], ['look-right', 800, -6], ['blink', 150, -6], ['look-right', 400, -6], ['default', 700, -9],
  ['look-right', 500, -5], ['look-down', 900, -5], ['walk-1', 260, -4], ['walk-2', 260, -3], ['walk-1', 260, -2],
  ['walk-2', 260, -1], ['walk-1', 260, 0], ['look-down', 1100, 0], ['default', 500, 0], ['blink', 150, 0],
  ['look-down', 700, 0], ['arms-up-one', 300, 0], ['arms-up-one-2', 300, 0], ['arms-up-one', 300, 0],
  ['look-down', 500, 0], ['happy', 900, 0],
]

// Woken (anything happening while it lies asleep): a start, a hop, a stretch and a yawn.
const WAKE: Beat[] = [['surprised', 400], ['hop', 200], ['stretch', 800], ['yawn', 300], ['yawn-2', 600], ['yawn', 200], ['sleepy', 400], ['blink', 150], ['default', 300]]
// The first session of a morning: still sleepy, it stretches and comes round.
const MORNING: Beat[] = [['sleepy', 600], ['stretch', 900], ['yawn', 300], ['yawn-2', 700], ['blink', 150], ['default', 300], ['happy', 600]]
// Idle late at night (22h to 6h) it yawns now and then, and falls asleep sooner.
const YAWN: Beat[] = [['yawn', 300], ['yawn-2', 800], ['yawn', 200], ['sleepy', 900], ['blink', 150], ['default', 300]]
const NIGHT_SLEEP_MS = 90000
// A long turn (LONG_MS and on): it types faster and every SWEAT_GAP_MS wipes its brow.
const LONG_MS = 120000
const SWEAT_GAP_MS = 45000
const SWEAT: Beat[] = [['sweat-1', 250], ['sweat-2', 250], ['facepalm-1', 200], ['facepalm-2', 200], ['facepalm-1', 200], ['happy', 300]]
// Tests passed: a thumbs up. (Failed ones get the head scratch, cued by register.)
const THUMBS: Beat[] = [['thumbs-up', 1000], ['happy', 400]]
// A subagent dispatched: it whistles to its right and the little helper runs off that way.
const WHISTLE: Beat[] = [['whistle', 350], ['whistle-2', 350], ['whistle', 350], ['look-right', 600], ['happy', 400]]
const WHISTLE_MS = 1050
// Gemini at work: glances up at its lines in the data; once it's done, waves up at them.
const GLANCE: Beat[] = [['look-up', 900], ['default', 300], ['look-up-left', 700], ['default', 300]]
const BYE: Beat[] = [['look-up', 400], ['arms-up-one', 300], ['arms-up-one-2', 300], ['arms-up-one', 300], ['arms-up-one-2', 300], ['happy', 600]]
// A rate limit past 90%: a worried look at its watch.
const WATCH: Beat[] = [['watch', 900], ['blink', 150], ['watch', 600], ['sweat-1', 250], ['sweat-2', 250], ['default', 300]]
// A double click: it spins three times round and gets dizzy.
const TURN: Pose[] = ['turn-quarter-left', 'turn-side-left', 'turn-back', 'turn-side-right', 'turn-quarter-right', 'default']
const SPIN: Beat[] = [...TURN, ...TURN, ...TURN].map((p): Beat => [p, 70]).concat(ACTS.dizzy)
let clickAt = 0
// A git push: it throws a paper plane that glides off to the right.
const THROW: Beat[] = [['arms-up-one', 250], ['arms-up-one-2', 200], ['look-right', 600], ['happy', 400]]
const THROW_MS = 450
const MINI_MS = 60
// The plane glides: from its hand (row 1) it swings between the top row and row 2 in a slow wave,
// slower climbing, quicker diving. `dist` is how far it has flown.
const glide = (dist: number) => Math.max(0, Math.min(2, Math.round(1 - Math.sin(dist / 4))))
const planeMs = (dist: number) => (Math.cos(dist / 4) > 0 ? 60 : 28)
// A dangerous command running: hands over its eyes, peeking now and then, until it's over.
// A start first, then trembling (the two cover frames swapped every 70 ms) with a peek now and then.
const TREMBLE: Beat[] = Array.from({ length: 10 }, (_, i): Beat => [i % 2 ? 'cover-2' : 'cover', 70])
const COVER: Beat[] = [['surprised', 300], ['hop', 150], ...TREMBLE, ['cover-peek', 450], ...TREMBLE, ['cover-peek', 450], ...TREMBLE]
const RELIEF: Beat[] = [['sweat-1', 250], ['sweat-2', 250], ['happy', 600]]
// A burst of searching (register cues it): the magnifying glass, side to side.
const SEARCH: Beat[] = [['lupa-left', 400], ['lupa-right', 400], ['lupa-left', 400], ['lupa-right', 400], ['default', 200]]
// Petted (the pointer rubbed back and forth over it): it blushes and hearts come out.
const BLUSH: Beat[] = [['blush', 700], ['love-1', 350], ['love-2', 350], ['love-3', 350], ['blush', 600], ['happy', 400]]
const PET_FLIPS = 4
let pet = { x: 0, dir: 0, flips: 0, at: 0 }
// The pointer back after AWAY_MS away from the panel: it waves.
const AWAY_MS = 10 * 60000
let awayAt = 0
// A session milestone (every 50 prompts, every million tokens): a party hat and confetti.
const PARTY: Beat[] = [['party', 500], ['excited-crouch', 150], ['party', 400], ...ACTS.confetti]
const markOf = (v: View) => Math.floor(v.prompts / 50) + 1000 * Math.floor(v.total / 1e6)
// Friday from 15h: now and then a dance in its sunglasses. The first minutes of the year: fireworks.
const DANCE: Beat[] = [['shades', 500], ['dance-left', 300], ['dance-right', 300], ['dance-left', 300], ['dance-right', 300], ['shades-shine', 300], ['shades', 500]]
const NEW_YEAR: Beat[] = [...ACTS.confetti, ...ACTS.excited, ...ACTS.confetti]
let newYear = 0
// Past half its context it carries a backpack and walks at HEAVY_STEP_MS a cell.
const HEAVY = 50
const HEAVY_STEP_MS = 150

// The install's anniversary (register cues it once that day): the cake, then confetti.
const FLICKER: Beat[] = Array.from({ length: 8 }, (_, i): Beat => [i % 2 ? 'cake-2' : 'cake-1', 250])
const BIRTHDAY: Beat[] = [...FLICKER, ['happy', 400], ...ACTS.confetti]
// A third error in a row: smoke off its head, knocked flat, up again shaking it off.
const SMOKE: Beat[] = [['angry-1', 300], ['smoke-1', 300], ['smoke-2', 300], ['smoke-1', 300], ['smoke-2', 300], ['surprised', 200],
  ['knocked', 600], ['knocked-2', 600], ['knocked', 600], ['hop', 200], ['sway-left', 120], ['sway-right', 120], ['sway-left', 120], ['sway-right', 120], ['default', 300]]
// Claude writing a plan: notes, a glance up to think, more notes.
const SCRIBBLE: Beat[] = [['notes-1', 300], ['notes-2', 200], ['notes-1', 200], ['notes-2', 200]]
const NOTES: Beat[] = [...SCRIBBLE, ['look-up-right', 600], ...SCRIBBLE, ['look-up', 500], ...SCRIBBLE, ['happy', 300]]
// A long prompt: it reads it, nodding along. A huge paste: the box lands on it.
const READ: Beat[] = [['look-down-left', 900], ['blink', 150], ['look-down-left', 700], ['look-down', 300], ['default', 250], ['look-down', 300], ['happy', 300]]
const BOX: Beat[] = [['surprised', 250], ['box-1', 300], ['box-2', 200], ['box-1', 200], ['box-3', 200], ['box-1', 200], ['box-2', 200], ['box-1', 400], ['happy', 400]]
// The pointer resting on it STARE_MS: it looks back, blinks and waves.
const STARE_MS = 3000
const STARE: Beat[] = [['default', 600], ['blink', 150], ['default', 500], ['happy', 300], ['arms-up-one', 300], ['arms-up-one-2', 300], ['arms-up-one', 300], ['happy', 400]]
let hoverAt = 0
// A long turn late at night: coffee instead of the sweat.
const COFFEE: Beat[] = [['coffee-1', 500], ['coffee-2', 700], ['coffee-1', 400], ['coffee-2', 600], ['happy', 300]]
// Two idle minutes (once per stretch): it fishes; half the time something bites.
const FISH_MS = 120000
const CAST: Beat[] = [['fish-1', 1500], ['fish-2', 1200], ['fish-1', 1500], ['fish-2', 1200], ['fish-1', 1500]]
const BITE: Beat[] = [['fish-bite', 400], ['fish-1', 200], ['fish-bite', 400], ['fish-catch', 1200], ['happy', 600]]
const fishing = (): Beat[] => [...CAST, ...(Math.random() < 0.5 ? BITE : [['sit-1', 400], ['default', 300]] as Beat[])]
let fishedFor = 0
// Now and then (1 idle in SNEEZE_ODDS) a sneeze that knocks it a step back.
const SNEEZE_ODDS = 40
const SNEEZE: Beat[] = [['look-up', 300], ['sleepy', 300], ['look-up', 250], ['sleepy', 200], ['sneeze', 350], ['blink', 200], ['default', 300]]

// How far past an edge it leans when it peeks.
const PEEK = 4
const peekAt = (right: boolean): Beat[] => {
  const look = right ? 'look-right' : 'look-left'
  return [[look, 900], ['default', 300], [look, 700], ['happy', 400]]
}
const SIT: Beat[] = [['sit-1', 400], ['sit-2', 400], ['sit-1', 400], ['sit-2', 400], ['sit-1', 1500], ['blink', 150], ['sit-1', 900], ['sit-2', 400], ['sit-1', 400], ['sit-2', 400], ['hop', 200], ['default', 300]]

const Panel: ClientModule<View, State> = (view, surface) => {
  latest = view
  const { Box, Text } = surface.elements

  if (surface.state === undefined) {
    const now = Date.now()
    // Just installed (register cues 'shy' on its first session ever): the shy entrance instead of the wave.
    const shy = view.cue.name === 'shy'
    const opening = view.cue.name === 'morning' ? MORNING : view.cue.name === 'birthday' ? BIRTHDAY : ACTS.hello
    surface.setState({ pose: 'default', queue: shy ? [] : [...opening], until: 0, look: 'default', cue: view.cue.n, blinkAt: now + 3000, idleAt: now + 12000, tool: 0, scene: 'laptop', wasWorking: false, restAt: now, reel: 0, goal: 0, gait: 'walk', stepAt: 0, trek: 0, stride: 0, lead: 0, leadAt: 0, rush: '', seenAt: view.news[0]?.at ?? 0, lift: shy ? 0 : -1, liftAt: 0, shy, x: shy ? -9 : 0, waveAt: 0, wave: -1, zoomAt: 0, zoom: 1, busyAt: now, sweatAt: 0, gem: !!view.gemini, mini: -1, miniAt: 0, flyer: 'mini', mark: markOf(view) })

    surface.every(TICK_MS, () => {
      const s = surface.state
      const v = latest
      if (!s || !v || v.still) return
      const now = Date.now()
      let { queue, until, cue, blinkAt, idleAt, tool, scene, restAt, goal, gait, stepAt, lead, leadAt, rush, seenAt, lift, liftAt, shy, waveAt, zoomAt, busyAt, sweatAt, mini, miniAt, flyer, mark } = s
      // The floor it can stand on: the region's width less its own.
      const room = Math.max(0, surface.columns - (v.working ? SCENE_COLUMNS : STAGE_COLUMNS))
      // Past the edges only while peeking (or coming back from it), never at the laptop.
      const reach = lift >= 0 ? STAGE_COLUMNS : (rush === 'peek' || goal !== s.x) && !v.working ? PEEK : 0
      let x = Math.max(-reach, Math.min(s.x, room + reach))
      goal = Math.max(-reach, Math.min(goal, room + reach))
      if (v.cue.n !== cue) {
        cue = v.cue.n
        const act = ACTS[v.cue.name as keyof typeof ACTS]
        // A celebration arriving with a wave under way leaves Neo's punch alone.
        if (act && !(v.cue.name === 'celebrate' && waveAt)) (queue = [...act]), (until = 0)
        // The turn's answer is in: the jump and punch up, the wave leaving as it lands.
        if (v.cue.name === 'neo') (queue = [...INTRO, ...NEO]), (until = 0), (zoomAt = now), (waveAt = now + INTRO_MS + NEO_WAVE)
        // /braves-panel scratch: the head scratch from the laptop routine, a few rubs longer.
        if (v.cue.name === 'morning') (queue = [...MORNING]), (until = 0)
        if (v.cue.name === 'tests-pass') (queue = [...THUMBS]), (until = 0)
        if (v.cue.name === 'helper') (queue = [...WHISTLE]), (until = 0), (miniAt = now + WHISTLE_MS), (mini = -1), (flyer = 'mini')
        if (v.cue.name === 'push') (queue = [...THROW]), (until = 0), (miniAt = now + THROW_MS), (mini = -1), (flyer = 'plane')
        if (v.cue.name === 'scared') (queue = [...COVER]), (until = 0)
        if (v.cue.name === 'relief') (queue = [...RELIEF]), (until = 0)
        if (v.cue.name === 'search' && queue.length === 0) (queue = [...SEARCH]), (until = 0)
        if (v.cue.name === 'pet') (queue = [...BLUSH]), (until = 0)
        if (v.cue.name === 'party') (queue = [...PARTY]), (until = 0)
        if (v.cue.name === 'dance') (queue = [...DANCE]), (until = 0)
        if (v.cue.name === 'birthday') (queue = [...BIRTHDAY]), (until = 0)
        if (v.cue.name === 'smoke') (queue = [...SMOKE]), (until = 0)
        if (v.cue.name === 'notes') (queue = [...NOTES]), (until = 0)
        if (v.cue.name === 'read' && queue.length === 0) (queue = [...READ]), (until = 0)
        if (v.cue.name === 'box') (queue = [...BOX]), (until = 0)
        if (v.cue.name === 'stare') (queue = [...STARE]), (until = 0)
        if (v.cue.name === 'coffee') (queue = [...COFFEE]), (until = 0)
        if (v.cue.name === 'fish') (queue = fishing()), (until = 0)
        if (v.cue.name === 'sneeze') (queue = [...SNEEZE]), (until = 0)
        if (v.cue.name === 'spin') (queue = [...SPIN]), (until = 0)
        // Asleep, whatever comes wakes it first.
        if (s.pose.startsWith('lie') && v.cue.name !== 'sleep') (queue = [...WAKE, ...queue]), (until = 0)
        // /braves-panel shy: the first-meeting entrance again.
        if (v.cue.name === 'shy') (queue = []), (lift = 0), (liftAt = 0), (shy = true), (rush = '')
        if (v.cue.name === 'scratch') (queue = Array.from({ length: 12 }, (_, i): Beat => [i % 2 ? 'work-7' : 'work-6', 160])), (until = 0)
        // /braves-panel peek | sit: the explore routines on demand.
        // A second error within a minute (angry) is a big problem: once the act ends it goes to look into the code.
        if ((v.cue.name === 'angry' || v.cue.name === 'lift') && lift < 0) (rush = 'lift'), (gait = 'walk'), (goal = 0)
        // /braves-panel sleep: the nap without three idle minutes.
        if (v.cue.name === 'sleep') (queue = []), (goal = x < room / 2 ? 0 : room), (gait = 'walk'), (rush = 'sleep')
        if (v.cue.name === 'peek' || v.cue.name === 'sit') (rush = v.cue.name), (gait = 'walk'), (goal = x < room / 2 ? room + (rush === 'peek' ? PEEK : 0) : rush === 'peek' ? -PEEK : 0)
        idleAt = now + 12000
        // The demo nap is a real one: it sleeps on until something wakes it.
        restAt = v.cue.name === 'sleep' ? now - 180001 : now
      }
      // A new headline: it runs to the ticker's start and points at it; an error startles it a few steps back.
      // Gemini's steps come too often to chase; a sprint keeps its jog.
      if ((v.news[0]?.at ?? seenAt) !== seenAt) {
        const kind = v.news[0]!.kind
        seenAt = v.news[0]!.at
        if (!v.sprint && kind === 'error') (queue = [['surprised', 450], ['hop', 200], ...queue]), (until = 0), (goal = Math.min(room, x + 5)), (gait = 'crab'), (rush = 'flee')
        else if (!v.sprint && kind !== 'gemini') (goal = 0), (gait = 'walk'), (rush = 'point')
      }
      if (rush && x === goal) {
        if (rush === 'point') queue = [...queue, ...POINT]
        if (rush === 'sit') queue = [...queue, ...SIT]
        if (rush === 'sleep') queue = [...queue, ...SNOOZE]
        if (rush === 'lift') (lift = 0), (liftAt = 0)
        if (rush === 'peek') (queue = [...queue, ...peekAt(x > 0)]), (goal = x > 0 ? room - PEEK : PEEK), (gait = 'walk')
        rush = ''
      }
      if (v.working && !s.wasWorking) busyAt = now
      const long = v.working && now - busyAt >= LONG_MS
      const late = new Date(now).getHours() >= 22 || new Date(now).getHours() < 6
      if (long && !v.sprint && queue.length === 0 && now >= until && now >= sweatAt) (queue = [...(late ? COFFEE : SWEAT)]), (sweatAt = now + SWEAT_GAP_MS)
      if (hoverAt && now - hoverAt >= STARE_MS && queue.length === 0 && now >= until) (hoverAt = 0), (queue = [...STARE])
      const gem = !!v.gemini
      if (s.gem && !gem) (queue = [...queue, ...BYE])
      // The helper: out from beside it once the whistle is done, a cell every MINI_STEP_MS, gone past the edge.
      if (mini < 0 && miniAt && now >= miniAt) (mini = x + STAGE_COLUMNS - 1), (miniAt = now)
      if (mini >= 0 && now >= miniAt) (mini++), (miniAt = now + (flyer === 'plane' ? planeMs(mini - x - STAGE_COLUMNS + 1) : MINI_MS))
      if (markOf(v) > mark) (mark = markOf(v)), (queue = [...queue, ...PARTY])
      if (mini >= surface.columns) (mini = -1), (miniAt = 0)
      const rushing = (rush !== '' && goal !== x) || lift >= 0
      // Working: its routine, unless an act (a send, a click, a reaction) is playing.
      // A sprint (a busy turn) swaps the laptop for a jog in place while the backdrop scrolls past.
      const jog = v.sprint && queue.length === 0 && now >= until
      const work = v.working && !v.sprint && !rushing && queue.length === 0 && now >= until ? workAt(long ? Math.floor(now * 1.5) : now, scene) : undefined
      if (v.working) (idleAt = now + 12000), (restAt = now)
      const free = !v.working && !v.sprint && lift < 0 && queue.length === 0 && now > until
      // Nothing going on: after a minute it meditates, after three it walks to the nearer corner and lies down to sleep.
      // Already lying there, the next breath queues on this same tick, so it never stands up between loops.
      const hour = new Date(now).getHours()
      const night = hour >= 22 || hour < 6
      const date = new Date(now)
      const friday = date.getDay() === 5 && hour >= 15
      if (date.getMonth() === 0 && date.getDate() === 1 && hour === 0 && date.getMinutes() < 10 && newYear !== date.getFullYear())
        (newYear = date.getFullYear()), (queue = [...queue, ...NEW_YEAR])
      const nap = night ? NIGHT_SLEEP_MS : 180000
      if (free && now - restAt > nap && s.pose.startsWith('lie')) queue = [...SNOOZE]
      else if (free && now - restAt > nap) (goal = x < room / 2 ? 0 : room), (gait = 'walk'), (rush = 'sleep')
      else if (free && now - restAt > FISH_MS && fishedFor !== restAt) (fishedFor = restAt), (queue = fishing())
      else if (free && now - restAt > 60000) queue = [...ACTS.meditate]
      // Idle long enough: a little routine, dizzy instead once the context is past 80%.
      else if (free && now > idleAt && Math.random() < 1 / SNEEZE_ODDS) (queue = [...SNEEZE]), (goal = Math.max(0, x - 1)), (gait = 'crab'), (idleAt = now + 12000 + Math.random() * 8000)
      else if (free && now > idleAt && (v.rates.some(l => l.pct >= 90) || (gem && tool % 2 === 0) || (night && tool % 3 === 0) || (friday && tool % 2 === 0))) {
        // Something on its mind takes the place of a routine: the limit, Gemini, the hour, the day.
        queue = [...(v.rates.some(l => l.pct >= 90) ? WATCH : gem && tool % 2 === 0 ? GLANCE : night && tool % 3 === 0 ? YAWN : DANCE)]
        tool++
        idleAt = now + 12000 + Math.random() * 8000
      } else if (free && now > idleAt) {
        const name = (v.ctx?.percent ?? 0) >= 80 ? 'dizzy' : IDLE[tool % IDLE.length]!
        // A walk crosses to the far side of the floor; a stage too narrow keeps it in place.
        const right = x < room / 2
        if ((name === 'walk' || name === 'crab') && room >= 6) {
          const r = Math.random() * 0.4 * room
          goal = Math.round(right ? room - r : r)
          gait = name
        } else if (name === 'lift') {
          rush = 'lift', gait = 'walk', goal = 0
        } else if (name === 'peek' || name === 'sit') {
          // To the far edge; a peek goes past it.
          goal = right ? room + (name === 'peek' ? PEEK : 0) : name === 'peek' ? -PEEK : 0
          gait = 'walk'
          rush = name
        } else if (name !== 'walk' && name !== 'crab') queue = [...ACTS[name]]
        tool++
        idleAt = now + 12000 + Math.random() * 8000
      }
      // Ticks per backdrop cell: 3 at an even pace, 1 on a surge, 4 while it drops back.
      let pace = 3
      const stride = v.sprint ? s.stride + 1 : 0
      let pose: Pose = s.look
      if (lift >= 0 && queue.length === 0 && (lift > 0 || now >= until)) {
        // The lift script runs on its own clock, the acts queued before it first.
        pose = s.pose
        if (now >= liftAt) {
          const step = (shy ? SHY : LIFT)[lift]
          if (step) (pose = step[0]), (liftAt = now + step[1]), (x = step[2]), lift++
          else (lift = -1), (goal = x), (shy = false)
        }
      } else if (now < until) pose = s.pose
      else if (queue[0]) {
        const [p, ms] = queue[0]
        pose = p, until = now + ms, queue = queue.slice(1)
      } else if (jog) {
        // It jogs to the middle of the stage, then now and then surges ahead and drops back.
        if (now > leadAt) (lead = Math.round(Math.random() * 7) - 3), (leadAt = now + 4000 + Math.random() * 4000)
        const target = Math.max(0, Math.min(room, Math.round(room / 2) + lead))
        const far = Math.abs(target - x) > 4
        if (x !== target && stride % (far ? 3 : 6) === 0) x += Math.sign(target - x)
        pace = target > x ? 1 : target < x ? 4 : 3
        // Counted in ticks, not clock time, so a late tick never skips a step; quicker legs on a surge.
        pose = ACTS.jog[Math.floor(stride / (pace === 1 ? 3 : 4)) % ACTS.jog.length]![0]
      } else if ((!v.working || rushing) && !v.sprint && goal !== x) {
        // Crossing the stage: a cell and a leg frame every STEP_MS, the editor's pace (the slack absorbs timer jitter).
        if (now >= stepAt) (x += Math.sign(goal - x)), (stepAt = now + ((v.ctx?.percent ?? 0) >= HEAVY ? HEAVY_STEP_MS : STEP_MS) - 10)
        // A leg frame every two cells (200 ms, the editor's): swapped every 100 ms step they shimmer.
        pose = `${gait}-${((x >> 1) & 1) + 1}` as Pose
        idleAt = now + 12000
      } else if (work === undefined && now > blinkAt) (pose = 'blink'), (until = now + 150), (blinkAt = now + 2500 + Math.random() * 3500)
      // The ticker crawls a cell every 150 ms while it has news.
      const reel = v.news.length > 0 ? Math.floor(now / 150) : s.reel
      // The turn just ended: now and then (a coin flip, five minutes apart at least) the jump, the punch and the wave.
      if (s.wasWorking && !v.working && now - neoAt > NEO_GAP_MS && Math.random() < 0.5)
        (queue = [...INTRO, ...NEO]), (until = 0), (zoomAt = now), (waveAt = now + INTRO_MS + NEO_WAVE), (neoAt = now)
      // The wave's progress in thousandths while it rises, -1 otherwise.
      const wave = waveAt && now >= waveAt && now - waveAt < WAVE_MS ? Math.floor(((now - waveAt) / WAVE_MS) * 1000) : -1
      if (waveAt && now - waveAt >= WAVE_MS) waveAt = 0
      // The camera: closing in, holding on the eyes, pulling back (eased), 1 when it isn't on.
      const shot = now - zoomAt
      const closeness = zoomAt && shot < INTRO_MS ? Math.min(1, shot / ZOOM_MS, (INTRO_MS - shot) / ZOOM_MS) : 0
      const zoom = Math.round((1 + (ZOOM - 1) * (1 - Math.cos(Math.PI * Math.max(0, closeness))) / 2) * 20) / 20
      const dropping = zoomAt && shot >= ZOOM_MS && shot < ZOOM_MS + DROP_MS
      const lens = dropping ? Math.round(LENS_START * (1 + Math.cos(Math.PI * (shot - ZOOM_MS) / DROP_MS)) / 2 * 20) / 20 : undefined
      if (zoomAt && shot >= INTRO_MS) zoomAt = 0
      const trek = v.sprint ? s.trek + (stride % pace === 0 ? 1 : 0) : s.trek
      if (pose !== s.pose || work !== s.work || cue !== s.cue || queue !== s.queue || v.working !== s.wasWorking || reel !== s.reel || x !== s.x || goal !== s.goal || stride !== s.stride || rush !== s.rush || seenAt !== s.seenAt || lift !== s.lift || shy !== s.shy || gem !== s.gem || mini !== s.mini || mark !== s.mark || wave !== s.wave || zoom !== s.zoom || lens !== s.lens) surface.setState({ ...s, pose, queue, until, cue, blinkAt, idleAt, tool, work, scene, wasWorking: v.working, restAt, reel, x, goal, gait, stepAt, trek, stride, lead, leadAt, rush, seenAt, lift, liftAt, shy, waveAt, wave, zoomAt, zoom, lens, busyAt, sweatAt, gem, mini, miniAt, flyer, mark })
    })

    surface.onPointer(e => {
      const s = surface.state
      if (!s || latest?.still) return
      const t0 = Date.now()
      if (e.type === 'leave') return (awayAt = t0), (hoverAt = 0), s.look !== 'default' && surface.setState({ ...s, look: 'default' })
      const back = awayAt && t0 - awayAt > AWAY_MS
      awayAt = 0
      if (back) return surface.setState({ ...s, queue: [...ACTS.hello], until: 0, restAt: t0 })
      // The stage is the footer: STAGE_ROWS rows above the floor line and the ticker, when there is news.
      const top = surface.rows - STAGE_ROWS - (latest?.news.length ? 2 : 1)
      const onStage = e.y >= top && e.y < top + STAGE_ROWS
      // A click on it makes it hop; a click on the floor elsewhere sends it there.
      if (e.type === 'down' && onStage && e.x >= s.x && e.x < s.x + STAGE_COLUMNS) {
        // A second click within 400 ms is a double click: it spins.
        const t = Date.now()
        const spin = t - clickAt < 400
        clickAt = spin ? 0 : t
        return surface.setState({ ...s, queue: [...(spin ? SPIN : ACTS.poke)], until: 0, restAt: t })
      }
      if (e.type === 'down' && onStage && !latest?.working) {
        const goal = Math.max(0, Math.min(surface.columns - STAGE_COLUMNS, Math.round(e.x - STAGE_COLUMNS / 2)))
        return surface.setState({ ...s, goal, gait: 'walk', restAt: Date.now() })
      }
      // Resting on it: every move over it restarts the clock for the stare, a move off it stops it.
      const onIt = onStage && e.x >= s.x && e.x < s.x + STAGE_COLUMNS
      if (e.type === 'move') hoverAt = onIt ? t0 : 0
      // Rubbed back and forth over it: each turn of direction counts, PET_FLIPS within 1.5 s pets it.
      if (e.type === 'move' && onIt) {
        const d = Math.sign(e.x - pet.x)
        if (t0 - pet.at > 1500) pet.flips = 0
        if (d && pet.dir && d !== pet.dir) (pet.flips++), (pet.at = t0)
        if (d) pet.dir = d
        pet.x = e.x
        if (pet.flips >= PET_FLIPS) return (pet = { x: e.x, dir: 0, flips: 0, at: 0 }), surface.setState({ ...s, queue: [...BLUSH], until: 0, restAt: t0 })
      }
      const dx = (e.fine?.x ?? e.x + 0.5) - (s.x + STAGE_COLUMNS / 2)
      // Its eyes sit on the stage's second row. A cell is about twice as tall as wide, so a row up
      // counts as two columns across. Eight ways, 45° each: an axis counts once the pointer is past
      // tan 22.5° (0.414) of the other.
      const dy = (e.fine?.y ?? e.y + 0.5) - (top + 1.75)
      const h = Math.abs(dx) >= 2 && Math.abs(dx) > 0.414 * Math.abs(2 * dy) ? (dx < 0 ? 'left' : 'right') : ''
      const v = Math.abs(dy) >= 1.5 && Math.abs(2 * dy) > 0.414 * Math.abs(dx) ? (dy < 0 ? 'up' : 'down') : ''
      const look = (v || h ? ['look', v, h].filter(Boolean).join('-') : 'default') as Pose
      if (look !== s.look) surface.setState({ ...s, look, restAt: Date.now() })
    })
  }

  // Walking left, it faces left: the walk is drawn facing right.
  const leftward = /^(walk|crab)-/.test(surface.state?.pose ?? '') && (surface.state?.goal ?? 0) < (surface.state?.x ?? 0)
  const sprite = toRuns(surface.state?.pose ?? 'default', surface.state?.work, surface.state?.scene, leftward)
  // The stage, cell by cell: the backdrop (a sprint's, blank otherwise), the mascot over it at x.
  const across = Math.max(STAGE_COLUMNS, surface.columns)
  const trek = surface.state?.trek ?? 0
  const scenery = BACKDROP_ORDER[Math.floor(Date.now() / 20000) % BACKDROP_ORDER.length]!
  const ground: Cell[][] = view.sprint
    ? backdrop(scenery, across, trek)
    : sprite.map(() => Array.from({ length: across }, () => ({ ch: ' ' })))
  // Cells to runs of one color over one background.
  const toLine = (row: Cell[]) => {
    const runs: (Run & { bg?: string })[] = []
    for (const cell of row) {
      const last = runs.at(-1)
      if (last && last.color === cell.color && last.bg === cell.bg) last.text += cell.ch
      else runs.push({ text: cell.ch, color: cell.color, bg: cell.bg })
    }
    return runs
  }
  const zoom = surface.state?.zoom ?? 1
  const stage: (Run & { bg?: string })[][] = zoom > 1 ? zoomed(surface.state?.pose ?? 'default', across, surface.state?.x ?? 0, zoom, ZOOM, surface.state?.lens) : sprite.map((line, r) => {
    const row = ground[r]!
    const x = surface.state?.x ?? 0
    const cells = line.flatMap(run => [...run.text].map(ch => ({ ch, color: run.color, back: run.bg })))
    // Between its first and last glyph the mascot hides the backdrop, so the legs never merge into a building.
    const from = cells.findIndex(cell => cell.ch !== ' ')
    const to = cells.findLastIndex(cell => cell.ch !== ' ')
    // The sky stays behind it: the mascot's cells keep the row's background.
    for (let i = from; from >= 0 && i <= to; i++) if (x + i >= 0 && x + i < across) {
      const bg = row[x + i]!.bg
      const { ch, color, back } = cells[i]!
      row[x + i] = ch === ' ' ? { ch: ' ', bg } : { ch, color, bg: back ?? bg }
    }
    const paint = (col: number, ch: string, color: string) => {
      if (ch !== ' ' && col >= 0 && col < across) row[col] = { ch, color, bg: row[col]!.bg }
    }
    // Standing on its own (not at the laptop, not lying or sitting): the backpack and the December hat,
    // only where its own sprite leaves the cell blank.
    const pose = surface.state?.pose ?? 'default'
    const standing = surface.state?.work === undefined && !/^(lie|sit|lean|meditate)/.test(pose)
    const ctx = view.ctx?.percent ?? 0
    const pack = ctx >= HEAVY && standing ? PACK[ctx >= 80 ? 2 : ctx >= 65 ? 1 : 0]![r - 1] : undefined
    const behind = leftward ? STAGE_COLUMNS - 1 : 0
    if (pack && cells[behind]?.ch === ' ') paint(x + behind, pack, PALETTE[3])
    if (r === 0 && standing && new Date().getMonth() === 11) [...HAT].forEach((ch, i) => {
      if (cells[2 + i]?.ch === ' ') paint(x + 2 + i, ch, ch === '•' ? PALETTE[2] : PALETTE[4])
    })
    // The helper runs along the bottom two rows; the paper plane glides over the top three.
    const mini = surface.state?.mini ?? -1
    const plane = surface.state?.flyer === 'plane'
    const art = plane ? (r === glide(mini - x - STAGE_COLUMNS + 1) ? '✈' : undefined) : MINI[(mini >> 1) & 1]![r - (STAGE_ROWS - 2)]
    if (mini >= 0 && art) [...art].forEach((ch, i) => paint(mini + i, ch, plane ? PALETTE[2] : PALETTE[0]))
    return toLine(row)
  })
  const floor = view.sprint ? toLine(groundRow(scenery, across, trek)) : null

  const L = LABELS[view.lang]
  const headline = (n: News): Run => ({
    ask: { text: `? ${n.detail}`, color: 'warning' },
    plan: { text: `✦ ${L.plan}`, color: 'suggestion' },
    error: { text: `✗ ${n.detail} ${L.failed}`, color: 'error' },
    deny: { text: `⊘ ${n.detail} ${L.denied}`, color: 'warning' },
    commit: { text: `● ${L.commit}${n.detail ? `: ${n.detail}` : ''}`, color: 'success' },
    ship: { text: `★ ${L.ship}`, color: 'success' },
    gemini: { text: `✦ Gemini: ${n.detail}`, color: GEMINI_COLOR },
  })[n.kind]
  const ticker = marquee(view.news.map(headline), surface.columns, view.still ? 0 : surface.state?.reel ?? 0)
  const Row = (label: string, value: RenderChildren) => (
    <Text wrap="truncate-end"><Text dimColor>{'  ' + (label.length >= LABEL ? label.slice(0, LABEL - 2) + '… ' : label.padEnd(LABEL))}</Text>{value}</Text>
  )
  const InOut = (x: Turn) => (
    <Text><Text color="suggestion">↑ {fmtTokens(x.input)}</Text>  <Text color="success">↓ {fmtTokens(x.output)}</Text></Text>
  )
  const Gauge = (pct: number, warn?: number, crit?: number, cells?: number) => (
    <Text><Text color={colorFor(pct, warn, crit)}>{bar(pct, cells)}</Text> <Text bold>{pct}%</Text></Text>
  )
  // The data as one line per element, so the wave can show one view above it and another below.
  const rowsOf = (v: View): RenderChildren[] => {
    const out: RenderChildren[] = [
      <Text wrap="truncate-end"><Text bold>Claude Code</Text> <Text dimColor>v{v.version}</Text></Text>,
      <Text wrap="truncate-end" dimColor>{v.model}{v.plan ? ` · ${v.plan}` : ''}</Text>,
      <Text wrap="truncate-start" dimColor>{v.cwd}</Text>,
    ]
    const section = (icon: string, title: string, color: string, rows: (RenderChildren | false | null)[]) =>
      out.push(<Text> </Text>, <Text color={color} bold>{icon} {title}</Text>, ...rows.filter(r => r !== false && r !== null))
    const toolMax = v.tools[0]?.[1] ?? 1
    const toolCount = v.tools.reduce((n, [, c]) => n + c, 0)
    section('◷', L.session, BRAND, [
      Row(L.time, <Text bold>{v.time}</Text>),
      Row(L.branch, <Text color="suggestion">⎇ {v.branch || L.noGit}</Text>),
    ])
    section('⇅', L.tokens, BRAND, [
      Row(L.lastPrompt, v.last ? InOut(v.last) : <Text dimColor>{L.waitAnswer}</Text>),
      ...v.prev.map((x, i) => Row(`${L.prompt} -${i + 1}`, <Text dimColor>↑ {fmtTokens(x.input)}  ↓ {fmtTokens(x.output)}</Text>)),
    ])
    section('◔', L.context, BRAND, v.ctx === null
      ? [Row(L.used, <Text dimColor>{L.waitResponse}</Text>)]
      : [Row(L.used, Gauge(v.ctx.percent, 30, 50)), Row(L.tokensRow, <Text>{fmtTokens(v.ctx.tokens)} <Text dimColor>/ {fmtTokens(v.ctx.window)}</Text></Text>)])
    section('Σ', L.totals, BRAND, [
      Row(L.sessionRow, <Text><Text bold>{fmtTokens(v.total)}</Text> <Text dimColor>· {v.prompts} {v.prompts === 1 ? L.prompt.toLowerCase() : L.prompts}</Text></Text>),
      ...v.rates.map(r => Row(r.label, <Text>{Gauge(r.pct, undefined, undefined, 10)}<Text dimColor>{r.reset}</Text></Text>)),
    ])
    section('$', L.cost, BRAND, [
      Row(L.billing, v.billing === 'subscription'
        ? <Text color="suggestion">◆ {L.subscription}</Text>
        : v.billing === 'api' ? <Text color="warning">◆ API</Text> : <Text dimColor>{L.detecting}</Text>),
      v.usd !== null && Row(v.billing === 'subscription' ? L.wouldCost : L.spent,
        <Text><Text bold color={v.billing === 'api' ? 'warning' : 'success'}>${v.usd.toFixed(2)}</Text>{v.billing === 'subscription' && <Text dimColor> {L.atApi}</Text>}</Text>),
    ])
    if (v.gemini) section('✦', v.gemini.isSlow ? `GEMINI · ${L.quiet}` : 'GEMINI', v.gemini.isSlow ? 'warning' : GEMINI_COLOR, [
      Row(L.model, <Text color={GEMINI_COLOR}>{v.gemini.model}</Text>),
      !!v.gemini.step && Row(L.step, v.gemini.step),
      !!v.gemini.doing && Row(L.doing, v.gemini.doing),
      !!v.gemini.elapsed && Row(L.elapsed, v.gemini.elapsed),
      v.gemini.pct !== null && Row(L.contextRow, Gauge(v.gemini.pct, 30, 50)),
      !!v.gemini.tokens && Row(L.tokensRow, <Text dimColor>{v.gemini.tokens}</Text>),
    ])
    section('⚙', `${L.tools} · ${toolCount} ${L.calls}`, BRAND, v.tools.length === 0
      ? [Row('', <Text dimColor>{L.none}</Text>)]
      : v.tools.slice(0, v.room).map(([name, n]) => Row(name,
        <Text><Text color="suggestion">{'▪'.repeat(Math.max(1, Math.round((n / toolMax) * 10)))}</Text> {n}</Text>)))
    return out
  }

  // Neo: while Claude works the data holds still; when the turn ends a line rises from the stage and
  // rewrites it, the old view above the line, the new one below (Gemini stays live throughout).
  const wave = surface.state?.wave ?? -1
  // Held from the turn's start until the wave has gone (a turn that just ended, or a wave on its way).
  const holding = view.working || !!surface.state?.wasWorking || !!surface.state?.waveAt
  if (view.working) frozen ??= lastIdle ?? view
  else if (!holding) (frozen = undefined), (lastIdle = view)
  const fresh = rowsOf(view)
  const stale = holding ? rowsOf({ ...(frozen ?? view), gemini: view.gemini }) : fresh
  const footer = STAGE_ROWS + 1 + (ticker.length > 0 ? 1 : 0)
  const line = wave < 0 ? -1 : Math.round(Math.min(fresh.length, surface.rows - footer) * (1 - wave / 1000))
  const body = wave < 0 ? (holding ? stale : fresh) : fresh.map((row, i) =>
    i < line ? stale[i] ?? <Text> </Text> : i === line ? <Text color={BRAND} bold>{'━'.repeat(across)}</Text> : row)

  return (
    <Box flexDirection="column" flexGrow={1}>
    <Box flexDirection="column" flexGrow={1} flexShrink={1} minHeight={0} overflow="hidden">
      {body}
    </Box>
    <Box flexDirection="column" flexShrink={0}>
      {stage.map(line => <Text wrap="truncate-end">{line.map(r => <Text color={r.color} backgroundColor={r.bg}>{r.text}</Text>)}</Text>)}
      {floor
        ? <Text wrap="truncate-end">{floor.map(r => <Text color={r.color} backgroundColor={r.bg}>{r.text}</Text>)}</Text>
        : <Text dimColor>{'▔'.repeat(across)}</Text>}
      {/* The ticker shows only while there is news. */}
      {ticker.length > 0 && <Text wrap="truncate-end">{ticker.map(r => <Text color={r.color}>{r.text}</Text>)}</Text>}
    </Box>
    </Box>
  )
}

export default Panel
