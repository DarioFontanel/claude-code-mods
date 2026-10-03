import { expect, mock, test } from 'claude-code/testing'

// Quello che Claude Code passa a un hook ui.render per i due pannelli
const pane = (requestId: string, title: string) =>
  ({
    plugin: 'quick-buttons',
    component: 'Pane',
    requestId,
    viewport: { columns: 160, rows: 40 },
    props: {
      title,
      isFocused: true,
      bodyColumns: 34,
      placement: 'inline',
      scroll: { offset: 0, bodyRows: 15 },
      view: {},
    },
  }) as const
const BUTTONS = pane('quick-buttons', 'Azioni')
const SETUP = pane('quick-buttons-setup', 'Scegli i bottoni')

// La sessione ha due skill, il comando della mod e un comando di Claude Code
const COMMANDS = [
  { name: 'azioni', description: '', source: 'plugin' },
  { name: 'commit', description: '', source: 'user' },
  { name: 'compact', description: '', source: 'builtin' },
  { name: 'deploy', description: '', source: 'user' },
] as const

test('alla prima sessione si scelgono i comandi, che diventano bottoni e restano salvati', async ($, on) => {
  // Lo store parte vuoto; quello che la mod salva resta qui
  const saved: Record<string, unknown> = {}
  on('store.get', ($, e) => ({ value: saved[e.key] }))
  on('store.set', ($, e) => {
    saved[e.key] = e.value
    return { value: undefined }
  })
  on('command.list', () => ({ value: [...COMMANDS] }))
  on('command.register', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))
  const opened: string[] = []
  on('ui.open', ($, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', () => ({ value: undefined }))
  // I comandi lanciati dalla mod arrivano qui, dopo il suo hook
  const ran: string[] = []
  on('command.run', ($, e) => {
    ran.push(e.command)
    return { text: '' }
  })

  // Nessuna scelta salvata: all'avvio si apre la scelta, non i bottoni
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  expect(opened).toEqual(['quick-buttons-setup'])

  const setup = await $.ui.mount({ ...SETUP, surface: 'terminal' })
  // Fra cui scegliere ci sono le skill, non i comandi di Claude Code né quello della mod
  expect(await setup.find({ type: 'Button', key: 'pick-commit' })).toBeDefined()
  expect(await setup.find({ type: 'Button', key: 'pick-compact' })).toBeUndefined()
  expect(await setup.find({ type: 'Button', key: 'pick-azioni' })).toBeUndefined()
  await setup.press({ key: 'pick-deploy' })
  expect(await setup.find({ type: 'Button', text: '✓ deploy' })).toBeDefined()
  await setup.press({ key: 'save' })
  await setup.unmount()

  expect(saved).toEqual({ commands: ['deploy'] })
  expect(opened).toEqual(['quick-buttons-setup', 'quick-buttons'])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BUTTONS, surface })
    expect(await ui.find({ type: 'Button', key: 'commit' })).toBeUndefined()
    await ui.press({ key: 'deploy' })
    expect(await ui.find({ type: 'Text', text: '/deploy lanciato' })).toBeDefined()
    await ui.unmount()
  }
  expect(ran).toEqual(['deploy', 'deploy'])
})

test('con una scelta salvata si aprono i bottoni, e /azioni config riapre la scelta', async ($, on) => {
  // replay è stato scelto ma la sessione non lo ha
  mock.store(on, { commands: ['commit', 'replay'] })
  on('command.list', () => ({ value: [...COMMANDS] }))
  on('command.register', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))
  const opened: string[] = []
  on('ui.open', ($, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', () => ({ value: undefined }))

  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.command.run({ command: 'azioni', args: '' })
  expect(opened).toEqual(['quick-buttons', 'quick-buttons'])

  const ui = await $.ui.mount({ ...BUTTONS, surface: 'terminal' })
  expect(await ui.find({ type: 'Button', key: 'commit' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'replay' })).toBeUndefined()
  await ui.unmount()

  await $.command.run({ command: 'azioni', args: 'config' })
  expect(opened).toEqual(['quick-buttons', 'quick-buttons', 'quick-buttons-setup'])
  const setup = await $.ui.mount({ ...SETUP, surface: 'terminal' })
  expect(await setup.find({ type: 'Button', text: '✓ commit' })).toBeDefined()
  await setup.unmount()
})
