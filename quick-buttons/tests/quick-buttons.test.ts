import { expect, test } from 'claude-code/testing'

// Quello che Claude Code passa a un hook ui.render per questo pannello
const PANE = {
  plugin: 'quick-buttons',
  component: 'Pane',
  requestId: 'quick-buttons',
  viewport: { columns: 160, rows: 40 },
  props: {
    title: 'Azioni',
    isFocused: true,
    bodyColumns: 18,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

test('la barra mostra solo i comandi presenti e un bottone lancia il suo', async ($, on) => {
  // La sessione ha commit, handoff e wayfinder ma non replay
  const names = ['azioni', 'commit', 'handoff', 'wayfinder']
  on('command.list', () => ({ value: names.map((name) => ({ name, description: '', source: 'skill' })) }))
  on('command.register', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))
  // La barra viene chiesta stretta, sia all'avvio sia da /azioni
  const widths: number[] = []
  on('ui.open', ($, e) => {
    widths.push(e.columns)
    return { value: { isPlaced: true } }
  })
  // I comandi lanciati dalla mod arrivano qui, dopo il suo hook
  const ran: string[] = []
  on('command.run', ($, e) => {
    ran.push(e.command)
    return { text: '' }
  })

  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.command.run({ command: 'azioni', args: '' })
  expect(widths).toEqual([18, 18])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Button', key: 'wayfinder' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'replay' })).toBeUndefined()
    await ui.press({ key: 'commit' })
    expect(await ui.find({ type: 'Text', text: '/commit lanciato' })).toBeDefined()
    await ui.unmount()
  }

  expect(ran).toEqual(['commit', 'commit'])
})
