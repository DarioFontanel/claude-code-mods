import { expect, mock, test } from 'claude-code/testing'

const MINUTE = 60 * 1000

// Quello che Claude Code passa a un hook ui.render per la banda sopra il prompt
const BAND = {
  plugin: 'cache-meter',
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

// Una richiesta al modello andata a buon fine
function stubStep(on) {
  on('turn.step', async function* ($, e) {
    yield { kind: 'text', index: 0, text: 'ok' }
    return {
      turnId: e.turnId,
      index: e.index,
      answer: 'ok',
      toolUses: [],
      stopReason: 'end_turn',
      usage: {
        model: 'claude-test',
        output_tokens: 50,
        input_tokens: 500,
        cache_read_input_tokens: 9000,
        cache_creation_input_tokens: 500,
      },
    }
  })
}

async function runStep($, input = {}) {
  const stream = $.turn.step({ turnId: 't', index: 0, model: 'claude-test', messageCount: 1, ...input })
  let step = await stream.next()
  while (step.done !== true) step = await stream.next()
  return step.value
}

test('la barra si svuota col tempo e una nuova richiesta la riempie', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 })
  stubStep(on)
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['altra mod'] }))

  for (const surface of ['terminal', 'desktop'] as const) {
    await runStep($)

    // Appena dopo la richiesta: barra piena, un'ora davanti
    let ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: '█'.repeat(24) })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '60 min rimasti' })).toBeDefined()
    // Il disegno delle altre mod resta nella banda
    expect(await ui.find({ type: 'Text', text: 'altra mod' })).toBeDefined()
    await ui.unmount()

    // Mezz'ora dopo: metà barra
    await clock.advance(30 * MINUTE)
    ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: '█'.repeat(12) })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '30 min rimasti' })).toBeDefined()
    await ui.unmount()

    // Passata l'ora: scaduta
    await clock.advance(31 * MINUTE)
    ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: 'scaduta' })).toBeDefined()
    await ui.unmount()
  }
})

test('le richieste dei subagent non rinnovano la barra', async ($, on) => {
  mock.clock(on)
  stubStep(on)
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['altra mod'] }))

  await runStep($, { agentId: 'agent-1' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'cache · in attesa della prima richiesta' })).toBeDefined()
  await ui.unmount()
})
