import type { ClientModule, RenderChildren } from 'claude-code'

import { BRAND, GEMINI_COLOR, LABEL, LABELS, bar, colorFor, fmtTokens, marquee } from './format'
import type { Run, View } from './format'
import type { News, Turn } from '../types'
import { ACTS, STAGE_COLUMNS, STAGE_ROWS, TICK_MS, toRuns, workAt } from './mascot'
import type { Beat, Pose, Scene } from './mascot'
import { BACKDROP_ORDER, backdrop, ground as groundRow } from './scenery'
import type { Cell } from './scenery'

// The whole panel draws here as a Client so the pointer anywhere over it
// reaches the mascot: it looks toward the pointer, a click makes it hop.

type State = { pose: Pose; queue: Beat[]; until: number; look: -1 | 0 | 1; cue: number; blinkAt: number; idleAt: number; tool: number; work?: number; scene: Scene; wasWorking: boolean; restAt: number; reel: number; x: number; goal: number; gait: 'walk' | 'crab'; stepAt: number; trek: number; stride: number; lead: number; leadAt: number; rush: '' | 'point' | 'flee' | 'peek' | 'sit' | 'lift' | 'sleep'; seenAt: number; lift: number; liftAt: number }

let latest: View | undefined

// Pointing down-left at the ticker, once it got there.
const POINT: Beat[] = [['point-1', 300], ['point-2', 300], ['point-1', 250], ['point-2', 600], ['happy', 400]]

// Columns the work scenes take; the other poses take STAGE_COLUMNS.
const SCENE_COLUMNS = 13

// What it does when idle, in turn; walk and crab cross the stage instead of stepping in place.
// peek: walks half off one edge to look past it; sit: sits down at an edge for a while.
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
    surface.setState({ pose: 'default', queue: [...ACTS.hello], until: 0, look: 0, cue: view.cue.n, blinkAt: now + 3000, idleAt: now + 12000, tool: 0, scene: 'laptop', wasWorking: false, restAt: now, reel: 0, x: 0, goal: 0, gait: 'walk', stepAt: 0, trek: 0, stride: 0, lead: 0, leadAt: 0, rush: '', seenAt: view.news[0]?.at ?? 0, lift: -1, liftAt: 0 })

    surface.every(TICK_MS, () => {
      const s = surface.state
      const v = latest
      if (!s || !v || v.still) return
      const now = Date.now()
      let { queue, until, cue, blinkAt, idleAt, tool, scene, restAt, goal, gait, stepAt, lead, leadAt, rush, seenAt, lift, liftAt } = s
      // The floor it can stand on: the region's width less its own.
      const room = Math.max(0, surface.columns - (v.working ? SCENE_COLUMNS : STAGE_COLUMNS))
      // Past the edges only while peeking (or coming back from it), never at the laptop.
      const reach = lift >= 0 ? PEEK : (rush === 'peek' || goal !== s.x) && !v.working ? PEEK : 0
      let x = Math.max(-reach, Math.min(s.x, room + reach))
      goal = Math.max(-reach, Math.min(goal, room + reach))
      if (v.cue.n !== cue) {
        cue = v.cue.n
        const act = ACTS[v.cue.name as keyof typeof ACTS]
        if (act) (queue = [...act]), (until = 0)
        // /braves-panel scratch: the head scratch from the laptop routine, a few rubs longer.
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
        if (rush === 'sleep') queue = [...queue, ...ACTS.sleep]
        if (rush === 'lift') (lift = 0), (liftAt = 0)
        if (rush === 'peek') (queue = [...queue, ...peekAt(x > 0)]), (goal = x > 0 ? room - PEEK : PEEK), (gait = 'walk')
        rush = ''
      }
      const rushing = (rush !== '' && goal !== x) || lift >= 0
      // Working: its routine, unless an act (a send, a click, a reaction) is playing.
      // A sprint (a busy turn) swaps the laptop for a jog in place while the backdrop scrolls past.
      const jog = v.sprint && queue.length === 0 && now >= until
      const work = v.working && !v.sprint && !rushing && queue.length === 0 && now >= until ? workAt(now, scene) : undefined
      if (v.working) (idleAt = now + 12000), (restAt = now)
      const free = !v.working && !v.sprint && lift < 0 && queue.length === 0 && now > until
      // Nothing going on: after a minute it meditates, after three it walks to the nearer corner and lies down to sleep.
      if (free && now - restAt > 180000) (goal = x < room / 2 ? 0 : room), (gait = 'walk'), (rush = 'sleep')
      else if (free && now - restAt > 60000) queue = [...ACTS.meditate]
      // Idle long enough: a little routine, dizzy instead once the context is past 80%.
      else if (free && now > idleAt) {
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
      // Ticks per backdrop cell: 2 at an even pace, 1 on a surge, 3 while it drops back.
      let pace = 2
      const stride = v.sprint ? s.stride + 1 : 0
      let pose: Pose = s.look < 0 ? 'look-left' : s.look > 0 ? 'look-right' : 'default'
      if (lift >= 0 && queue.length === 0 && (lift > 0 || now >= until)) {
        // The lift script runs on its own clock, the acts queued before it first.
        pose = s.pose
        if (now >= liftAt) {
          const step = LIFT[lift]
          if (step) (pose = step[0]), (liftAt = now + step[1]), (x = step[2]), lift++
          else (lift = -1), (goal = x)
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
        if (x !== target && stride % (far ? 2 : 4) === 0) x += Math.sign(target - x)
        pace = target > x ? 1 : target < x ? 3 : 2
        // Counted in ticks, not clock time, so a late tick never skips a step; quicker legs on a surge.
        pose = ACTS.jog[Math.floor(stride / (pace === 1 ? 2 : 3)) % ACTS.jog.length]![0]
      } else if ((!v.working || rushing) && !v.sprint && goal !== x) {
        // Crossing the stage: a cell every tick (the slack absorbs timer jitter), legs alternating.
        if (now >= stepAt) (x += Math.sign(goal - x)), (stepAt = now + TICK_MS - 10)
        pose = `${gait}-${(x & 1) + 1}` as Pose
        idleAt = now + 12000
      } else if (work === undefined && now > blinkAt) (pose = 'blink'), (until = now + 150), (blinkAt = now + 2500 + Math.random() * 3500)
      // The ticker crawls a cell every 150 ms while it has news.
      const reel = v.news.length > 0 ? Math.floor(now / 150) : s.reel
      const trek = v.sprint ? s.trek + (stride % pace === 0 ? 1 : 0) : s.trek
      if (pose !== s.pose || work !== s.work || cue !== s.cue || queue !== s.queue || v.working !== s.wasWorking || reel !== s.reel || x !== s.x || goal !== s.goal || stride !== s.stride || rush !== s.rush || seenAt !== s.seenAt || lift !== s.lift) surface.setState({ ...s, pose, queue, until, cue, blinkAt, idleAt, tool, work, scene, wasWorking: v.working, restAt, reel, x, goal, gait, stepAt, trek, stride, lead, leadAt, rush, seenAt, lift, liftAt })
    })

    surface.onPointer(e => {
      const s = surface.state
      if (!s || latest?.still) return
      if (e.type === 'leave') return s.look !== 0 && surface.setState({ ...s, look: 0 })
      // The stage is the footer: STAGE_ROWS rows above the floor line and the ticker, when there is news.
      const top = surface.rows - STAGE_ROWS - (latest?.news.length ? 2 : 1)
      const onStage = e.y >= top && e.y < top + STAGE_ROWS
      // A click on it makes it hop; a click on the floor elsewhere sends it there.
      if (e.type === 'down' && onStage && e.x >= s.x && e.x < s.x + STAGE_COLUMNS) return surface.setState({ ...s, queue: [...ACTS.poke], until: 0, restAt: Date.now() })
      if (e.type === 'down' && onStage && !latest?.working) {
        const goal = Math.max(0, Math.min(surface.columns - STAGE_COLUMNS, Math.round(e.x - STAGE_COLUMNS / 2)))
        return surface.setState({ ...s, goal, gait: 'walk', restAt: Date.now() })
      }
      const dx = (e.fine?.x ?? e.x + 0.5) - (s.x + STAGE_COLUMNS / 2)
      const look = Math.abs(dx) < 2 ? 0 : dx < 0 ? -1 : 1
      if (look !== s.look) surface.setState({ ...s, look, restAt: Date.now() })
    })
  }

  const sprite = toRuns(surface.state?.pose ?? 'default', surface.state?.work, surface.state?.scene)
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
  const stage = sprite.map((line, r) => {
    const row = ground[r]!
    const x = surface.state?.x ?? 0
    const cells = line.flatMap(run => [...run.text].map(ch => ({ ch, color: run.color })))
    // Between its first and last glyph the mascot hides the backdrop, so the legs never merge into a building.
    const from = cells.findIndex(cell => cell.ch !== ' ')
    const to = cells.findLastIndex(cell => cell.ch !== ' ')
    // The sky stays behind it: the mascot's cells keep the row's background.
    for (let i = from; from >= 0 && i <= to; i++) if (x + i >= 0 && x + i < across) {
      const bg = row[x + i]!.bg
      row[x + i] = cells[i]!.ch === ' ' ? { ch: ' ', bg } : { ...cells[i]!, bg }
    }
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
  const Section = (icon: string, title: string, color: string, body: RenderChildren) => (
    <Box flexDirection="column">
      <Text color={color} bold>{icon} {title}</Text>
      {body}
    </Box>
  )
  const Row = (label: string, value: RenderChildren) => (
    <Text wrap="truncate-end"><Text dimColor>{'  ' + (label.length >= LABEL ? label.slice(0, LABEL - 2) + '… ' : label.padEnd(LABEL))}</Text>{value}</Text>
  )
  const InOut = (x: Turn) => (
    <Text><Text color="suggestion">↑ {fmtTokens(x.input)}</Text>  <Text color="success">↓ {fmtTokens(x.output)}</Text></Text>
  )
  const Gauge = (pct: number, warn?: number, crit?: number, cells?: number) => (
    <Text><Text color={colorFor(pct, warn, crit)}>{bar(pct, cells)}</Text> <Text bold>{pct}%</Text></Text>
  )
  const toolMax = view.tools[0]?.[1] ?? 1
  const toolCount = view.tools.reduce((n, [, c]) => n + c, 0)

  return (
    <Box flexDirection="column" flexGrow={1}>
    <Box flexDirection="column" gap={1} flexGrow={1} flexShrink={1} minHeight={0} overflow="hidden">
      <Box flexDirection="column">
        <Text wrap="truncate-end"><Text bold>Claude Code</Text> <Text dimColor>v{view.version}</Text></Text>
        <Text wrap="truncate-end" dimColor>{view.model}{view.plan ? ` · ${view.plan}` : ''}</Text>
        <Text wrap="truncate-start" dimColor>{view.cwd}</Text>
      </Box>

      {Section('◷', L.session, BRAND, <Box flexDirection="column">
        {Row(L.time, <Text bold>{view.time}</Text>)}
        {Row(L.branch, <Text color="suggestion">⎇ {view.branch || L.noGit}</Text>)}
      </Box>)}

      {Section('⇅', L.tokens, BRAND, <Box flexDirection="column">
        {Row(L.lastPrompt, view.last ? InOut(view.last) : <Text dimColor>{L.waitAnswer}</Text>)}
        {view.prev.map((x, i) => Row(`${L.prompt} -${i + 1}`, <Text dimColor>↑ {fmtTokens(x.input)}  ↓ {fmtTokens(x.output)}</Text>))}
      </Box>)}

      {Section('◔', L.context, BRAND, view.ctx === null
        ? Row(L.used, <Text dimColor>{L.waitResponse}</Text>)
        : <Box flexDirection="column">
          {Row(L.used, Gauge(view.ctx.percent, 30, 50))}
          {Row(L.tokensRow, <Text>{fmtTokens(view.ctx.tokens)} <Text dimColor>/ {fmtTokens(view.ctx.window)}</Text></Text>)}
        </Box>)}

      {Section('Σ', L.totals, BRAND, <Box flexDirection="column">
        {Row(L.sessionRow, <Text><Text bold>{fmtTokens(view.total)}</Text> <Text dimColor>· {view.prompts} {view.prompts === 1 ? L.prompt.toLowerCase() : L.prompts}</Text></Text>)}
        {view.rates.map(r => Row(r.label, <Text>{Gauge(r.pct, undefined, undefined, 10)}<Text dimColor>{r.reset}</Text></Text>))}
      </Box>)}

      {Section('$', L.cost, BRAND, <Box flexDirection="column">
        {Row(L.billing, view.billing === 'subscription'
          ? <Text color="suggestion">◆ {L.subscription}</Text>
          : view.billing === 'api' ? <Text color="warning">◆ API</Text> : <Text dimColor>{L.detecting}</Text>)}
        {view.usd !== null && Row(view.billing === 'subscription' ? L.wouldCost : L.spent,
          <Text><Text bold color={view.billing === 'api' ? 'warning' : 'success'}>${view.usd.toFixed(2)}</Text>{view.billing === 'subscription' && <Text dimColor> {L.atApi}</Text>}</Text>)}
      </Box>)}

      {view.gemini && Section('✦', view.gemini.isSlow ? `GEMINI · ${L.quiet}` : 'GEMINI', view.gemini.isSlow ? 'warning' : GEMINI_COLOR, <Box flexDirection="column">
        {Row(L.model, <Text color={GEMINI_COLOR}>{view.gemini.model}</Text>)}
        {view.gemini.step && Row(L.step, view.gemini.step)}
        {view.gemini.doing && Row(L.doing, view.gemini.doing)}
        {view.gemini.elapsed && Row(L.elapsed, view.gemini.elapsed)}
        {view.gemini.pct !== null && Row(L.contextRow, Gauge(view.gemini.pct, 30, 50))}
        {view.gemini.tokens && Row(L.tokensRow, <Text dimColor>{view.gemini.tokens}</Text>)}
      </Box>)}

      {Section('⚙', `${L.tools} · ${toolCount} ${L.calls}`, BRAND, view.tools.length === 0
        ? Row('', <Text dimColor>{L.none}</Text>)
        : view.tools.slice(0, view.room).map(([name, n]) => Row(name,
          <Text><Text color="suggestion">{'▪'.repeat(Math.max(1, Math.round((n / toolMax) * 10)))}</Text> {n}</Text>)))}
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
