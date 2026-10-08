import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Account, Gemini, Lang, News, Turn } from '../types'

import { LABELS, NEWS_TTL, accountOf, commitTitle, fmtDuration, langOf, parseGemini, planOf, tildePath, untilReset } from './format'
import type { View } from './format'
import { STAGE_ROWS } from './mascot'

const PANE = 'braves-panel'
const TITLE = 'Braves'
// Wide enough for the context row (label, 12-cell bar, % and tokens) on one line.
const WIDTH = 48
const GEMINI_SCRIPT = '$HOME/.claude/skills/braves-skills/scripts/gemini-dispatch.sh'

const turns = atom({ plugin: 'braves-panel', key: 'turns' } as const, [] as Turn[])
const tools = atom({ plugin: 'braves-panel', key: 'tools' } as const, {} as Record<string, number>)
const branch = atom({ plugin: 'braves-panel', key: 'branch' } as const, '')
const now = atom({ plugin: 'braves-panel', key: 'now' } as const, 0)
const lang = atom({ plugin: 'braves-panel', key: 'lang' } as const, 'es' as Lang)
const account = atom({ plugin: 'braves-panel', key: 'account' } as const, null as Account | null)
const isWorking = atom({ plugin: 'braves-panel', key: 'isWorking' } as const, false)
const isOpen = atom({ plugin: 'braves-panel', key: 'isOpen' } as const, false)
// Rows the pane shows at once; only ui.scroll tells, 0 until it does.
const bodyRows = atom({ plugin: 'braves-panel', key: 'bodyRows' } as const, 0)
const news = atom({ plugin: 'braves-panel', key: 'news' } as const, [] as News[])
const gemini = atom({ plugin: 'braves-panel', key: 'gemini' } as const, null as Gemini | null)
// What Zeus should do next; the panel's Client plays it when `n` moves.
const cue = atom({ plugin: 'braves-panel', key: 'cue' } as const, { name: 'hello', n: 0 })

async function refreshLang($: EngineInterface) {
  const r = await $.process.run(['sh', '-c', 'cat "$HOME/.claude/braves-skills.json" 2>/dev/null'], { timeoutMs: 2000 })
  await update($, lang, () => langOf(r.stdout))
}

async function refreshAccount($: EngineInterface) {
  const [home, auth] = await Promise.all([
    $.process.run(['sh', '-c', 'printf %s "$HOME"'], { timeoutMs: 2000 }),
    $.process.run(['sh', '-c', 'claude auth status 2>/dev/null'], { timeoutMs: 5000 }),
  ])
  await update($, account, () => accountOf(auth.stdout, home.stdout))
}

async function refreshBranch($: EngineInterface) {
  const r = await $.process.run(['git', 'branch', '--show-current'], { cwd: await $.session.cwd(), timeoutMs: 2000 })
  await update($, branch, () => (r.exitCode === 0 ? r.stdout.trim() || 'HEAD' : ''))
}

async function refreshGemini($: EngineInterface) {
  const r = await $.process.run(
    ['sh', '-c', `[ -f "${GEMINI_SCRIPT}" ] && sh "${GEMINI_SCRIPT}" --status "$1" 2>/dev/null`, 'sh', await $.session.cwd()],
    { timeoutMs: 2000 },
  )
  const next = parseGemini(r.stdout)
  const prev = await read($, gemini)
  if (next?.step && next.step !== prev?.step) tell($, 'gemini', next.step)
  if (JSON.stringify(prev) !== JSON.stringify(next)) await update($, gemini, () => next)
}

// What Zeus should do next; kept for the image-sheet mascot.
const motion = { still: false, typedAt: 0, failedAt: 0, measuring: false, probe: 0 }

// The ticker keeps the latest few, newest first.
function tell($: EngineInterface, kind: News['kind'], detail = '') {
  void update($, news, list => [{ kind, detail, at: Date.now() }, ...list].slice(0, 6))
}

function say($: EngineInterface, name: string) {
  void update($, cue, c => ({ name, n: c.n + 1 }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'braves-panel', description: 'Show or hide the Braves usage panel' })
    await refreshLang($)
    void refreshAccount($)
    await refreshBranch($)
    await update($, now, () => Date.now())
    // ponytail: 30 s tick only moves the clock; usage figures redraw on session.measure.
    $.clock.every(30000, () => void update($, now, () => Date.now()))
    // A local shell call every 3 s, same cadence class as bravesline's refreshInterval; no tokens.
    $.clock.every(3000, () => void refreshGemini($))
    motion.still = (await $.settings.read()).prefersReducedMotion === true
    await update($, isOpen, () => true)
    void $.ui.open({ id: PANE, title: TITLE, columns: WIDTH })
    return next(e)
  })

  on('command.run', { command: 'braves-panel' }, async $ => {
    const L = LABELS[await read($, lang)]
    const open = !(await read($, isOpen))
    await update($, isOpen, () => open)
    if (open) await $.ui.open({ id: PANE, title: TITLE, columns: WIDTH })
    else await $.ui.close({ id: PANE })
    return { text: open ? L.opened : L.closed }
  })

  on('tool.call', async ($, e, next) => {
    await update($, tools, all => ({ ...all, [e.tool]: (all[e.tool] ?? 0) + 1 }))
    // Claude needs you (a question) or has a plan ready: the mascot says so before it shows.
    if (e.tool === 'AskUserQuestion') say($, 'point'), tell($, 'ask', e.questions?.[0]?.question ?? '')
    if (e.tool === 'ExitPlanMode') say($, 'lightbulb'), tell($, 'plan')
    const r = await next(e)
    // Answered or reviewed: the headline has nothing left to say.
    if (e.tool === 'AskUserQuestion' || e.tool === 'ExitPlanMode') {
      const kind = e.tool === 'AskUserQuestion' ? 'ask' : 'plan'
      void update($, news, list => list.filter(n => n.kind !== kind))
    }
    if (r.deny !== undefined) say($, 'disappointed'), tell($, 'deny', e.tool)
    else if (r.isError) {
      // A second failure within a minute is no longer a facepalm.
      say($, Date.now() - motion.failedAt < 60000 ? 'angry' : 'facepalm')
      tell($, 'error', e.tool)
      motion.failedAt = Date.now()
    }
    else if (e.tool === 'Bash') {
      // ponytail: reads the command text; a commit or a merge/release that went through.
      if (/\bgh (pr merge|release create)\b/.test(e.command)) say($, 'confetti'), tell($, 'ship')
      else if (/\bgit commit\b/.test(e.command)) say($, 'excited'), tell($, 'commit', commitTitle(e.command))
    }
    return r
  })

  // Zeus watches you type; one cue per 400 ms keeps the panel from redrawing on every key.
  on('prompt.edit', async ($, e, next) => {
    const t = Date.now()
    if (!motion.still && t - motion.typedAt > 400) {
      motion.typedAt = t
      say($, 'typing')
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    // A thank-you gets hearts instead of the usual hop.
    say($, /\b(gracias|thanks?|thank you|genial|excelente|bien hecho|te quiero|love)\b|❤/i.test(e.text) ? 'love' : 'jump')
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, isWorking, () => true)
    say($, 'thinking')
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      await update($, isWorking, () => false)
      if (e.reason === 'answer') say($, 'celebrate')
      else if (e.reason === 'aborted') say($, 'disappointed')
      else if (e.reason === 'error') say($, 'facepalm')
    }
    const u = e.usage
    if (u && !e.agentId) {
      const input = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      await update($, turns, list => [...list, { input, output: u.output_tokens }].slice(-50))
    }
    void refreshBranch($)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, now, () => Date.now())
    return next(e)
  })

  on('ui.scroll', { requestId: PANE }, async ($, e, next) => {
    if ((await read($, bodyRows)) !== e.bodyRows) await update($, bodyRows, () => e.bodyRows)
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box } = ui
    // Client and Raster are the terminal's; elsewhere the panel has nothing to draw with.
    if (!('Client' in ui)) return <Box />
    const { Client } = ui
    // ponytail: no resize event reaches a pane body; a scroll every second makes ui.scroll report its height.
    // It alternates ends: after a shrink the tree is taller than the window and a scroll to its own edge moves nothing.
    // Started on the first draw, not session.start, so a hot reload picks it up.
    if (!motion.measuring) {
      motion.measuring = true
      $.clock.every(1000, () => void $.ui.scroll({ in: PANE, to: motion.probe++ % 2 ? 'end' : 'start' }).catch(() => {}))
    }
    const [usage, list, used, br, at, gem, lg, headlines] = await Promise.all([
      $.session.usage(), read($, turns), read($, tools), read($, branch), read($, now), read($, gemini), read($, lang), read($, news),
    ])
    const [acct, model, version, cwd, working, next] = await Promise.all([
      read($, account), $.session.model(), $.session.version(), $.session.cwd(), read($, isWorking), read($, cue),
    ])
    const body = (await read($, bodyRows)) || undefined
    const L = LABELS[lg]
    const t = at || Date.now()
    const ctx = usage.context.percent
    // The pane's own rows once ui.scroll told them; the terminal's (taller) until then.
    const rows = body ?? e.viewport?.rows ?? 30
    const view: View = {
      lang: lg,
      still: motion.still,
      working,
      cue: next,
      version: version.base ?? version.version,
      model,
      plan: acct?.plan ?? null,
      cwd: tildePath(cwd, acct?.home ?? ''),
      time: fmtDuration(t - usage.startedAt),
      branch: br,
      last: list.at(-1) ?? null,
      prev: list.slice(-4, -1).reverse(),
      ctx: ctx === undefined ? null : { percent: ctx, tokens: usage.context.tokens ?? 0, window: usage.context.window },
      total: list.reduce((s, x) => s + x.input + x.output, 0),
      prompts: list.length,
      rates: usage.rateLimits.map(r => ({
        label: r.kind === 'five_hour' ? L.last5h : r.kind === 'seven_day' ? L.last7d : r.kind,
        pct: r.percentUsed,
        reset: untilReset(r.resetsAt, t),
      })),
      billing: acct ? (acct.isSubscription ? 'subscription' : 'api') : planOf(usage.rateLimits, ctx !== undefined),
      usd: usage.cost?.usd ?? null,
      gemini: gem,
      tools: Object.entries(used).sort((a, b) => b[1] - a[1]),
      // The data above the tools takes 28 rows (36 with Gemini); the footer, the stage, its floor and the ticker.
      room: Math.max(1, rows - (gem ? 36 : 28) - STAGE_ROWS - 2),
      news: headlines.filter(n => t - n.at < NEWS_TTL),
    }

    return (
      // viewport.rows is the whole terminal, not the pane: the body's own rows pin the footer.
      <Box flexDirection="column" height={body}>
        <Client key="panel" module="./panel.tsx" props={view} flexGrow={1} />
      </Box>
    )
  })
}
