// Un prossimo passo: l'etichetta del bottone e il prompt che invia
export type Step = { label: string; prompt: string }

declare module 'claude-code' {
  interface PluginState {
    'next-steps': { steps: Step[]; isThinking: boolean }
  }
}
