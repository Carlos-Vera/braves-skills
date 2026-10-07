import type { ClientModule, RenderChildren } from 'claude-code'

import { BRAND, GEMINI_COLOR, LABEL, LABELS, bar, colorFor, fmtTokens } from './format'
import type { View } from './format'
import type { Turn } from '../types'
import { ACTS, COOK_FRAMES, COOK_MS, STAGE_COLUMNS, STAGE_ROWS, TICK_MS, toRuns } from './mascot'
import type { Beat, Pose } from './mascot'

// The whole panel draws here as a Client so the pointer anywhere over it
// reaches the mascot: it looks toward the pointer, a click makes it hop.

type State = { pose: Pose; queue: Beat[]; until: number; look: -1 | 0 | 1; cue: number; blinkAt: number; idleAt: number; tool: number; cook?: number }

let latest: View | undefined

const Panel: ClientModule<View, State> = (view, surface) => {
  latest = view
  const { Box, Text } = surface.elements

  if (surface.state === undefined) {
    const now = Date.now()
    surface.setState({ pose: 'default', queue: [...ACTS.hello], until: 0, look: 0, cue: view.cue.n, blinkAt: now + 3000, idleAt: now + 12000, tool: 0 })

    surface.every(TICK_MS, () => {
      const s = surface.state
      const v = latest
      if (!s || !v || v.still) return
      const now = Date.now()
      let { queue, until, cue, blinkAt, idleAt, tool } = s
      if (v.cue.n !== cue) {
        cue = v.cue.n
        const act = ACTS[v.cue.name as keyof typeof ACTS]
        if (act) (queue = [...act]), (until = 0)
        idleAt = now + 12000
      }
      // Working: it cooks, unless an act (a send, a click) is playing.
      const cook = v.working && queue.length === 0 && now >= until ? Math.floor(now / COOK_MS) % COOK_FRAMES : undefined
      if (cook !== undefined) idleAt = now + 12000
      // Idle long enough: a look around, or now and then it shows off a tool.
      if (!v.working && queue.length === 0 && now > until && now > idleAt) {
        queue = [...(tool % 3 === 2 ? (tool % 2 ? ACTS.hammer : ACTS.wrench) : ACTS.idle)]
        tool++
        idleAt = now + 12000 + Math.random() * 8000
      }
      let pose: Pose = s.look < 0 ? 'look-left' : s.look > 0 ? 'look-right' : 'default'
      if (now < until) pose = s.pose
      else if (queue[0]) {
        const [p, ms] = queue[0]
        pose = p, until = now + ms, queue = queue.slice(1)
      } else if (cook === undefined && now > blinkAt) (pose = 'blink'), (until = now + 150), (blinkAt = now + 2500 + Math.random() * 3500)
      if (pose !== s.pose || cook !== s.cook || cue !== s.cue || queue !== s.queue) surface.setState({ ...s, pose, queue, until, cue, blinkAt, idleAt, tool, cook })
    })

    surface.onPointer(e => {
      const s = surface.state
      if (!s || latest?.still) return
      if (e.type === 'leave') return s.look !== 0 && surface.setState({ ...s, look: 0 })
      if (e.type === 'down' && e.x < STAGE_COLUMNS && e.y < STAGE_ROWS) return surface.setState({ ...s, queue: [...ACTS.poke], until: 0 })
      const dx = (e.fine?.x ?? e.x + 0.5) - STAGE_COLUMNS / 2
      const look = Math.abs(dx) < 2 ? 0 : dx < 0 ? -1 : 1
      if (look !== s.look) surface.setState({ ...s, look })
    })
  }

  const stage = toRuns(surface.state?.pose ?? 'default', surface.state?.cook)

  const L = LABELS[view.lang]
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
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="row" gap={2}>
        <Box flexDirection="column" flexShrink={0}>
          {stage.map(line => <Text>{line.map(r => <Text color={r.color} backgroundColor={r.bg}>{r.text}</Text>)}</Text>)}
        </Box>
        <Box flexDirection="column" flexShrink={1}>
          <Text wrap="truncate-end"><Text bold>Claude Code</Text> <Text dimColor>v{view.version}</Text></Text>
          <Text wrap="truncate-end" dimColor>{view.model}{view.plan ? ` · ${view.plan}` : ''}</Text>
          <Text wrap="truncate-start" dimColor>{view.cwd}</Text>
        </Box>
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
  )
}

export default Panel
