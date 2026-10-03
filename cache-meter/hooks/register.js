// Quanto dura la prompt cache dall'ultima richiesta che l'ha letta o scritta
const TTL_MS = 60 * 60 * 1000
// Ogni quanto la barra si ridisegna da sola
const TICK_MS = 30 * 1000

// L'istante dell'ultima richiesta della conversazione principale: da lì riparte l'ora
let lastAt = null
// L'ora letta all'ultimo tick o all'ultima richiesta
let now = 0
// Il timer che fa scorrere la barra, avviato alla prima richiesta
let ticking = null

// Verde finché c'è margine, rosso quando la cache sta per scadere
function leftColor(minutes) {
  if (minutes > 20) return 'green'
  if (minutes > 5) return 'yellow'
  return 'red'
}

export function register(on) {
  // Una richiesta al modello rinnova la cache: l'ora riparte dal suo risultato
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    // Solo la conversazione principale: i subagent hanno una cache loro
    if (!e.agentId && result.usage) {
      lastAt = now = await $.clock.now()
      ticking ??= $.clock.every(TICK_MS, async () => {
        now = await $.clock.now()
        $.ui.invalidate('ui.render')
      })
      $.ui.invalidate('ui.render')
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Quello che disegnano le altre mod nella banda resta sotto la nostra riga
    const theirs = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    const dim = (text) => Text({ dimColor: true, children: [text] })
    const withTheirs = (line) => (theirs ? Box({ flexDirection: 'column', children: [line, theirs] }) : line)

    if (lastAt === null) return withTheirs(dim('cache · in attesa della prima richiesta'))

    const width = e.props.bodyColumns >= 110 ? 24 : 12
    const leftMs = Math.max(0, TTL_MS - (now - lastAt))

    if (leftMs === 0) {
      return withTheirs(
        Box({
          flexDirection: 'row',
          children: [
            dim('cache  ' + '░'.repeat(width) + '  '),
            Text({ color: 'red', children: ['scaduta'] }),
            dim(' · la prossima richiesta la riscrive'),
          ],
        }),
      )
    }

    // La parte piena è il tempo che resta: la barra si svuota da destra
    const minutes = Math.ceil(leftMs / 60000)
    const full = Math.ceil((leftMs / TTL_MS) * width)
    const color = leftColor(minutes)
    return withTheirs(
      Box({
        flexDirection: 'row',
        children: [
          dim('cache  '),
          Text({ color, children: ['█'.repeat(full)] }),
          dim('░'.repeat(width - full) + '  '),
          Text({ color, children: [minutes + ' min rimasti'] }),
          dim(' · ' + (60 - minutes) + ' min dall\'ultima richiesta'),
        ],
      }),
    )
  })
}
