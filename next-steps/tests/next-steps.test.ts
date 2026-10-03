import { expect, mock, test } from 'claude-code/testing'

// Quello che Claude Code passa a un hook ui.render per la banda sopra il prompt
const BAND = {
  plugin: 'next-steps',
  component: 'AbovePrompt',
  viewport: { columns: 160, rows: 40 },
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 160,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const REPLY = JSON.stringify([
  { label: 'Lancia i test', prompt: 'Lancia i test della mod' },
  { label: 'Aggiorna la doc', prompt: 'Aggiorna la documentazione' },
])

test('a fine turno compaiono due passi e Replay, e ogni bottone fa il suo', async ($, on) => {
  const clock = mock.clock(on)
  on('turn.complete', () => ({ text: 'ok' }))
  on('model.fork', () => ({
    value: {
      isAnswered: true as const,
      text: 'Ecco:\n' + REPLY,
      usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    },
  }))
  // Prompt e comandi lanciati dalla mod arrivano qui, dopo i suoi hook
  const prompts: string[] = []
  on('prompt.submit', ($, e) => {
    prompts.push(e.text)
    return { text: e.text }
  })
  // Il disegno delle altre mod nella banda, sotto la nostra riga
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['altra mod'] }))
  const commands: string[] = []
  on('command.run', ($, e) => {
    commands.push(e.command)
    return { text: '' }
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })
    await clock.advance(0)

    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'step-1' })).toBeDefined()
    expect(await ui.find({ key: 'step-2' })).toBeDefined()
    await ui.press({ key: 'replay' })
    await ui.press({ key: 'step-2' })
    // Il prompt inviato azzera i passi: resta solo Replay
    expect(await ui.find({ key: 'step-1' })).toBeUndefined()
    expect(await ui.find({ key: 'replay' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'altra mod' })).toBeDefined()
    await ui.unmount()
  }

  expect(commands).toEqual(['replay', 'replay'])
  expect(prompts).toEqual(['Aggiorna la documentazione', 'Aggiorna la documentazione'])
})

test('il turno di un subagent non fa proporre nulla', async ($, on) => {
  const clock = mock.clock(on)
  on('turn.complete', () => ({ text: 'ok' }))
  let forks = 0
  on('model.fork', () => {
    forks += 1
    return { value: { isAnswered: false as const, reason: 'nothing-to-fork' as const } }
  })

  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer', agentId: 'a1' })
  await clock.advance(0)

  expect(forks).toBe(0)
})
