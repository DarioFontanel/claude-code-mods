import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Step } from '../types'

// I due passi proposti a fine turno, vuoti finché non arrivano
const steps = atom({ plugin: 'next-steps', key: 'steps' } as const, [])
// Vero mentre il modello sta scegliendo i passi
const isThinking = atom({ plugin: 'next-steps', key: 'isThinking' } as const, false)

// La domanda fatta al modello sopra la conversazione così com'è
const ASK = [
  'Non continuare il lavoro e non usare tool.',
  'Guarda la conversazione e il punto in cui siamo: proponi i due prossimi passi più naturali che potrei chiederti adesso.',
  'Devono essere concreti, diversi fra loro e eseguibili da te. Non proporre commit, push o di rivedere le modifiche: per quelli esiste già un bottone.',
  'Rispondi SOLO con un array JSON di due oggetti, senza altro testo:',
  '[{"label": "massimo 4 parole", "prompt": "il messaggio che ti scriverei, in prima persona, nella lingua della conversazione"}, {"label": "...", "prompt": "..."}]',
].join('\n')

// Dal testo del modello ai passi: il primo array JSON trovato, al massimo due voci valide
export function parseSteps(text: string): Step[] {
  const found = text.match(/\[[\s\S]*\]/)
  if (!found) return []
  try {
    const list: unknown = JSON.parse(found[0])
    if (!Array.isArray(list)) return []
    return list
      .filter((s) => typeof s?.label === 'string' && typeof s?.prompt === 'string' && s.label.trim() && s.prompt.trim())
      .slice(0, 2)
      .map((s) => ({ label: s.label.trim().slice(0, 40), prompt: s.prompt.trim() }))
  } catch {
    return []
  }
}

// Cresce a ogni prompt: una proposta partita prima del prompt è vecchia e si scarta
let generation = 0

async function suggest($: EngineInterface, mine: number) {
  let found: Step[] = []
  try {
    const reply = await $.model.fork({ prompt: ASK })
    if (reply.isAnswered) found = parseSteps(reply.text)
  } finally {
    if (mine === generation) {
      await update($, steps, () => found)
      await update($, isThinking, () => false)
    }
  }
}

// Un passo scelto: la riga si svuota e parte un turno con quel prompt, come se l'avessi scritto io.
// Il prompt.submit di una mod non ripassa dal suo stesso hook, quindi si azzera qui
async function pick($: EngineInterface, step: Step) {
  generation += 1
  await update($, steps, () => [])
  await update($, isThinking, () => false)
  await $.prompt.submit({ text: step.prompt, asUser: true })
}

export const register: Register = (on) => {
  // Un nuovo prompt: i passi proposti non valgono più
  on('prompt.submit', async ($, e, next) => {
    generation += 1
    await update($, steps, () => [])
    await update($, isThinking, () => false)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // Solo la conversazione principale, e solo quando Claude ha davvero risposto
    if (!e.agentId && e.reason === 'answer') {
      const mine = generation
      await update($, isThinking, () => true)
      // Fuori dal turno: la fine del turno non aspetta la proposta
      $.clock.after(0, () => void suggest($, mine))
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Quello che disegnano le altre mod nella banda resta sotto la nostra riga
    const theirs = await next(e)
    if (e.props.hasSurvey || e.props.isWorking) return theirs

    const { Box, Button, Text } = $.ui.resolve(e)
    const proposed = await read($, steps)
    const thinking = await read($, isThinking)

    const row = (
      <Box flexDirection="row" columnGap={3}>
        {proposed.map((step, i) => (
          <Button
            key={'step-' + (i + 1)}
            label={step.label}
            hotkey={String(i + 1)}
            plain
            onPress={() => void pick($, step)}
          />
        ))}
        {thinking ? <Text dimColor>prossimi passi…</Text> : null}
        <Button key="replay" label="Replay" hotkey="3" plain onPress={() => void $.command.run({ command: 'replay' })} />
      </Box>
    )

    return theirs ? (
      <Box flexDirection="column">
        {row}
        {theirs}
      </Box>
    ) : (
      row
    )
  })
}
