// L'id del pannello dei bottoni, usato per aprirlo e per riconoscerlo quando si disegna
const PANE = 'quick-buttons'
// L'id del pannello di scelta: quali comandi diventano bottoni
const SETUP = 'quick-buttons-setup'
// La chiave dello store in cui restano i comandi scelti, fra una sessione e l'altra
const CHOSEN = 'commands'
// Quanti bottoni al massimo
const MAX = 9

// I comandi fra cui scegliere: quelli della sessione che non sono di Claude Code né nostri
let available = []
// I comandi scelti, o null finché la scelta non è mai stata fatta
let chosen = null
// La scelta in corso nel pannello di scelta, il testo che filtra l'elenco e la pagina mostrata
let draft = []
let filter = ''
let page = 0
// Quanti comandi stanno in una pagina: dipende dall'altezza del pannello, letta quando si disegna
let pageSize = 10
// L'esito dell'ultimo click, mostrato in fondo al pannello
let status = ''

// Rilegge i comandi della sessione: una skill o una mod può essere arrivata dopo
async function loadCommands($) {
  try {
    const list = await $.command.list()
    available = list
      .filter((c) => c.source !== 'builtin' && c.name !== 'azioni')
      .map((c) => c.name)
      .sort()
  } catch {
    available = []
  }
}

// I comandi scelti che la sessione ha davvero: un bottone che non parte non serve
function shown() {
  return (chosen ?? []).filter((name) => available.includes(name))
}

// Il tasto rapido di ogni bottone: la prima lettera libera del nome, altrimenti una cifra
function hotkeys(names) {
  const taken = new Set()
  return names.map((name) => {
    const free = [...name.toLowerCase(), ...'123456789'].find((k) => /[a-z0-9]/.test(k) && !taken.has(k))
    taken.add(free)
    return free
  })
}

// Il pannello dei bottoni è una barra stretta a lato, alta quanto i suoi bottoni
function paneSpec() {
  return { id: PANE, title: 'Azioni', columns: 18, rows: shown().length + 3 }
}

// Chiude un pannello che può anche non essere aperto
async function closePane($, id) {
  try {
    await $.ui.close({ id })
  } catch {}
}

// I comandi che il filtro lascia passare
function matching() {
  const text = filter.trim().toLowerCase()
  return text ? available.filter((name) => name.toLowerCase().includes(text)) : available
}

// Apre la scelta partendo dai comandi già scelti
async function openSetup($, focus) {
  draft = [...(chosen ?? [])]
  filter = ''
  page = 0
  status = ''
  await closePane($, PANE)
  const spec = { id: SETUP, title: 'Scegli i bottoni', columns: 34, rows: 16 }
  return $.ui.open(focus ? { ...spec, focus: true, closeOnEscape: true } : spec)
}

// Un comando entra nella scelta o ne esce
function toggle($, name) {
  if (draft.includes(name)) draft = draft.filter((n) => n !== name)
  else if (draft.length < MAX) draft = [...draft, name]
  $.ui.invalidate('ui.render')
}

// Il testo scritto nel campo restringe l'elenco, che riparte dalla prima pagina
function setFilter($, text) {
  filter = text
  page = 0
  $.ui.invalidate('ui.render')
}

function turnPage($, by) {
  const last = Math.max(0, Math.ceil(matching().length / pageSize) - 1)
  page = Math.min(last, Math.max(0, page + by))
  $.ui.invalidate('ui.render')
}

// La scelta è fatta: resta nello store e il pannello dei bottoni prende il posto di questo
async function save($) {
  chosen = draft
  status = ''
  await $.store.set(CHOSEN, chosen)
  await closePane($, SETUP)
  await $.ui.open({ ...paneSpec(), focus: true })
}

// Il click su un bottone: lancia il comando e racconta l'esito in `status`
async function press($, command) {
  status = '/' + command + ' in coda'
  $.ui.invalidate('ui.render')
  try {
    // Come se fosse stato digitato: parte appena la sessione è libera
    await $.command.run({ command, args: '' })
    status = '/' + command + ' lanciato'
  } catch (error) {
    status = '/' + command + ' non partito: ' + (error?.message ?? error)
  }
  $.ui.invalidate('ui.render')
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await loadCommands($)
    const stored = await $.store.get(CHOSEN)
    chosen = Array.isArray(stored) ? stored.filter((name) => typeof name === 'string') : null
    // immediate: il pannello si apre anche mentre Claude lavora
    await $.command.register({
      name: 'azioni',
      description: 'Apri i bottoni rapidi; "/azioni config" per scegliere quali comandi mostrare',
      immediate: true,
    })
    if (chosen === null) {
      // Prima sessione dopo l'installazione: si chiede quali comandi diventano bottoni.
      // Da solo il pannello si siede solo su un terminale largo; altrimenti lo dice il toast
      void openSetup($, false).then((opened) => {
        if (!opened.isPlaced) $.ui.toast('Scegli i tuoi bottoni rapidi con /azioni')
      })
    } else {
      void $.ui.open(paneSpec())
    }
    return next(e)
  })

  on('command.run', { command: 'azioni' }, async ($, e) => {
    await loadCommands($)
    const isSetup = chosen === null || e.args.trim() === 'config'
    const opened = isSetup ? await openSetup($, true) : await $.ui.open({ ...paneSpec(), focus: true })
    // Se la superficie non disegna il pannello, dirlo invece di tacere
    return opened.isPlaced ? {} : { text: 'Pannello non disegnato: ' + opened.reason }
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE && e.requestId !== SETUP) return next(e)
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const dim = (text) => Text({ dimColor: true, wrap: 'wrap', children: [text] })

    if (e.requestId === SETUP) {
      if (available.length === 0) {
        return dim('Nessuna skill o comando personalizzato in questa sessione.')
      }
      // Le righe che restano all'elenco, tolte quelle di intestazione, campo e comandi
      pageSize = Math.max(5, (e.props.scroll?.bodyRows ?? 16) - 6)
      const width = Math.max(10, (e.props.bodyColumns ?? 34) - 3)
      const found = matching()
      const pages = Math.max(1, Math.ceil(found.length / pageSize))
      const rows = found.slice(page * pageSize, (page + 1) * pageSize).map((name) =>
        Button({
          key: 'pick-' + name,
          label: (draft.includes(name) ? '✓ ' : '· ') + (name.length > width ? name.slice(0, width - 1) + '…' : name),
          plain: true,
          onPress: () => toggle($, name),
        }),
      )
      return Box({
        flexDirection: 'column',
        children: [
          dim(draft.length + '/' + MAX + ' scelti' + (draft.length ? ': ' + draft.join(', ') : '')),
          Input({
            key: 'filter',
            label: 'Cerca ',
            placeholder: 'nome della skill',
            value: filter,
            submitLabel: 'filtra',
            autoFocus: true,
            onInput: (text) => setFilter($, text),
            onSubmit: (text) => setFilter($, text),
          }),
          ...rows,
          ...(rows.length === 0 ? [dim('Nessun comando con questo nome.')] : []),
          Box({
            flexDirection: 'row',
            columnGap: 2,
            children: [
              ...(pages > 1
                ? [
                    Button({ key: 'prev', label: 'Indietro', hotkey: 'p', plain: true, onPress: () => turnPage($, -1) }),
                    Button({ key: 'next', label: 'Avanti', hotkey: 'n', plain: true, onPress: () => turnPage($, 1) }),
                  ]
                : []),
              Button({ key: 'save', label: 'Salva', hotkey: 's', plain: true, onPress: () => save($) }),
            ],
          }),
          dim('pagina ' + (page + 1) + ' di ' + pages + ' · Invio aggiunge o toglie'),
        ],
      })
    }

    const names = shown()
    const keys = hotkeys(names)
    const buttons = names.map((name, i) =>
      Button({ key: name, label: name, hotkey: keys[i], plain: true, onPress: () => press($, name) }),
    )

    return Box({
      flexDirection: 'column',
      children: [
        ...buttons,
        ...(buttons.length === 0 ? [dim('Nessun bottone scelto.')] : []),
        Button({ key: 'setup', label: 'modifica', plain: true, dimColor: true, onPress: () => void openSetup($, true) }),
        dim(status),
      ],
    })
  })
}
