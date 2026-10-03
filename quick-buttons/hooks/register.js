// L'id del pannello, usato per aprirlo e per riconoscerlo quando si disegna
const PANE = 'quick-buttons'
// Il pannello è una barra stretta a lato: quanto basta per il bottone più lungo
const OPEN = { id: PANE, title: 'Azioni', columns: 18, rows: 6 }

// I bottoni: il comando che lanciano e il tasto rapido
const ACTIONS = [
  { command: 'commit', label: 'Commit', hotkey: 'c' },
  { command: 'handoff', label: 'Handoff', hotkey: 'h' },
  { command: 'wayfinder', label: 'Wayfinder', hotkey: 'w' },
  { command: 'replay', label: 'replay', hotkey: 'x' },
]

// I comandi che la sessione ha davvero, o null finché non sono stati letti
let available = null
// L'esito dell'ultimo click, mostrato in fondo al pannello
let status = ''

// Rilegge i comandi della sessione: una skill o una mod può essere arrivata dopo
async function loadCommands($) {
  try {
    available = new Set((await $.command.list()).map((c) => c.name))
  } catch {
    available = null
  }
}

// Il click su un bottone: lancia il comando e racconta l'esito in `status`
async function press($, action) {
  status = '/' + action.command + ' in coda'
  $.ui.invalidate('ui.render')
  try {
    // Come se fosse stato digitato: parte appena la sessione è libera
    await $.command.run({ command: action.command, args: '' })
    status = '/' + action.command + ' lanciato'
  } catch (error) {
    status = '/' + action.command + ' non partito: ' + (error?.message ?? error)
  }
  $.ui.invalidate('ui.render')
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await loadCommands($)
    // immediate: il pannello si apre anche mentre Claude lavora
    await $.command.register({ name: 'azioni', description: 'Apri la barra laterale dei bottoni rapidi', immediate: true })
    // Da sola la barra si siede solo su un terminale largo; altrimenti /azioni
    void $.ui.open(OPEN)
    return next(e)
  })

  on('command.run', { command: 'azioni' }, async ($) => {
    await loadCommands($)
    const opened = await $.ui.open({ ...OPEN, focus: true })
    // Se la superficie non disegna il pannello, dirlo invece di tacere
    return opened.isPlaced ? {} : { text: 'Pannello non disegnato: ' + opened.reason }
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)

    // Solo i comandi che la sessione ha: un bottone che non parte non serve
    const buttons = ACTIONS.filter((action) => available === null || available.has(action.command)).map((action) =>
      Button({
        key: action.command,
        label: action.label,
        hotkey: action.hotkey,
        plain: true,
        onPress: () => press($, action),
      }),
    )

    return Box({
      flexDirection: 'column',
      children: [...buttons, Text({ dimColor: true, wrap: 'wrap', children: [status] })],
    })
  })
}
