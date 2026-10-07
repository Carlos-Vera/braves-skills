export type Lang = 'es' | 'en'

export type Account = { isSubscription: boolean; plan: string; home: string }

export type Turn = { input: number; output: number }

export type Gemini = {
  isSlow: boolean
  pct: number | null
  model: string
  step: string
  doing: string
  elapsed: string
  tokens: string
}

declare module 'claude-code' {
  interface PluginState {
    'braves-panel': {
      turns: Turn[]
      tools: Record<string, number>
      branch: string
      now: number
      isOpen: boolean
      gemini: Gemini | null
      lang: Lang
      account: Account | null
      isWorking: boolean
      cue: { name: string; n: number }
    }
  }
}
