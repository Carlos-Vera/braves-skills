import type { Account, Gemini, Lang, News, Turn } from '../types'

// Pure helpers shared by the hooks module and the panel's drawing module.
export const LABEL = 15
export const BRAND = '#01b7af'
export const GEMINI_COLOR = '#af87ff' // bravesline's 256-colour 141

export const LABELS = {
  es: {
    session: 'SESIÓN', time: 'Tiempo', branch: 'Rama', noGit: 'Sin Git',
    tokens: 'TOKENS', lastPrompt: 'Último pedido', prompt: 'Pedido', prompts: 'pedidos',
    waitAnswer: 'esperando la primera respuesta', waitResponse: 'esperando la primera respuesta',
    context: 'CONTEXTO', used: 'Usado', tokensRow: 'Tokens',
    totals: 'TOTALES', sessionRow: 'Sesión', last5h: 'Últimas 5h', last7d: 'Últimos 7d',
    cost: 'COSTO', billing: 'Facturación', subscription: 'Suscripción', detecting: 'detectando…',
    wouldCost: 'Costaría', spent: 'Gastado', atApi: 'a precio de API',
    quiet: 'en silencio', model: 'Modelo', step: 'Paso', doing: 'Haciendo', elapsed: 'Tiempo', contextRow: 'Contexto',
    tools: 'HERRAMIENTAS', calls: 'usos', none: 'ninguna todavía',
    opened: 'Panel de Braves abierto.', closed: 'Panel de Braves cerrado.',
    plan: 'Plan listo para revisar', failed: 'falló', denied: 'denegado', commit: 'Commit', ship: 'Merge / release publicado',
  },
  en: {
    session: 'SESSION', time: 'Time', branch: 'Branch', noGit: 'No Git',
    tokens: 'TOKENS', lastPrompt: 'Last prompt', prompt: 'Prompt', prompts: 'prompts',
    waitAnswer: 'waiting for the first answer', waitResponse: 'waiting for the first response',
    context: 'CONTEXT', used: 'Used', tokensRow: 'Tokens',
    totals: 'TOTALS', sessionRow: 'Session', last5h: 'Last 5h', last7d: 'Last 7d',
    cost: 'COST', billing: 'Billing', subscription: 'Subscription', detecting: 'detecting…',
    wouldCost: 'Would cost', spent: 'Spent', atApi: 'at API prices',
    quiet: 'quiet', model: 'Model', step: 'Step', doing: 'Doing', elapsed: 'Elapsed', contextRow: 'Context',
    tools: 'TOOLS', calls: 'calls', none: 'none yet',
    opened: 'Braves panel opened.', closed: 'Braves panel closed.',
    plan: 'Plan ready to review', failed: 'failed', denied: 'denied', commit: 'Commit', ship: 'Merge / release shipped',
  },
} satisfies Record<Lang, Record<string, string>>

// Same thresholds as bravesline: context warns earlier than the rate windows.
export const colorFor = (pct: number, warn = 50, crit = 80) =>
  pct >= crit ? 'error' : pct >= warn ? 'warning' : 'success'

export const fmtTokens = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`

export const fmtDuration = (ms: number) => {
  const min = Math.max(0, Math.floor(ms / 60000))
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`
}

export const bar = (pct: number, cells = 12) => {
  const full = Math.round((Math.min(100, Math.max(0, pct)) / 100) * cells)
  return '▰'.repeat(full) + '▱'.repeat(cells - full)
}

// Rate-limit windows only exist on a subscription; before the first response neither shows.
export const planOf = (rateLimits: readonly unknown[], hasResponse: boolean) =>
  rateLimits.length > 0 ? 'subscription' : hasResponse ? 'api' : 'unknown'

/** Reads `claude auth status`: a claude.ai login bills the subscription, anything else the API. */
export const accountOf = (json: string, home: string): Account | null => {
  try {
    const a = JSON.parse(json) as { authMethod?: string; subscriptionType?: string }
    const isSubscription = a.authMethod === 'claude.ai'
    const tier = a.subscriptionType ? a.subscriptionType[0]!.toUpperCase() + a.subscriptionType.slice(1) : ''
    return { isSubscription, plan: isSubscription ? `Claude ${tier}`.trim() : 'API', home }
  } catch {
    return null
  }
}

export const tildePath = (path: string, home: string) =>
  home && path.startsWith(home) ? '~' + path.slice(home.length) : path

/**
 * Parses `gemini-dispatch.sh --status`: "<state>\t<pct>\t<text>", or nothing when idle.
 * The text reads "model · #step · tool Ns · elapsed · tok:▰▱ used / window".
 */
export const parseGemini = (raw: string): Gemini | null => {
  const line = raw.trim()
  if (!line) return null
  const [state = 'run', pct = '', text = ''] = line.split('\t')
  const parts = text.split(' · ')
  const tok = parts.findIndex(p => p.startsWith('tok:'))
  const tokens = tok >= 0 ? (parts.splice(tok, 1)[0] ?? '').replace(/^tok:\S*\s*/, '') : ''
  const [model = '', step = '', doing = '', elapsed = ''] = parts
  return { isSlow: state === 'slow', pct: pct === '' ? null : Number(pct), model, step, doing, elapsed, tokens }
}

export const untilReset = (iso: string | undefined, at: number) =>
  iso ? ` ↺ ${fmtDuration(Date.parse(iso) - at)}` : ''

// The braves toolbox's own setting: the language the user talks in. Unset means Spanish.
export const langOf = (json: string): Lang => {
  try {
    return String(JSON.parse(json).language ?? 'es').toLowerCase().startsWith('en') ? 'en' : 'es'
  } catch {
    return 'es'
  }
}

/** Everything the panel draws, computed by the hooks module and handed to the Client as plain data. */
export type View = {
  lang: Lang
  still: boolean
  working: boolean
  cue: { name: string; n: number }
  version: string
  model: string
  plan: string | null
  cwd: string
  time: string
  branch: string
  last: Turn | null
  prev: Turn[]
  ctx: { percent: number; tokens: number; window: number } | null
  total: number
  prompts: number
  rates: { label: string; pct: number; reset: string }[]
  billing: 'subscription' | 'api' | 'unknown'
  usd: number | null
  gemini: Gemini | null
  tools: [string, number][]
  room: number
  news: News[]
}

export type Run = { text: string; color?: string }

// A ticker window: the runs as one looping tape, `width` cells from `offset`; still when it fits.
export function marquee(items: Run[], width: number, offset: number): Run[] {
  const cells = items.flatMap(r => [...[...r.text].map(ch => ({ ch, color: r.color })), ...[...'   ◆   '].map(ch => ({ ch, color: undefined as string | undefined }))])
  if (cells.length === 0 || width <= 0) return []
  const fits = cells.length - 7 <= width
  const shown = fits ? cells.slice(0, cells.length - 7) : Array.from({ length: width }, (_, i) => cells[(offset + i) % cells.length]!)
  const runs: Run[] = []
  for (const c of shown) {
    const last = runs.at(-1)
    if (last && last.color === c.color) last.text += c.ch
    else runs.push({ text: c.ch, color: c.color })
  }
  return runs
}
