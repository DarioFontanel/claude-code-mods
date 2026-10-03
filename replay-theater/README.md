# replay-theater

Variante di **Replay Theater**, la mod di esempio pubblicata da Anthropic in [claude-code-playground](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/replay-theater) con licenza Apache-2.0. Registra le modifiche ai file dell'ultimo turno (Edit, Write, MultiEdit) e le mostra in un pannello, un diff alla volta, senza bloccare né alterare le chiamate.

## Modifiche rispetto all'originale

- **Banda sopra il prompt** — rimossi il suggerimento `▶ Replay: N edits` e il relativo bottone. Il bottone Replay è disegnato dalla mod `next-steps` (tasto `3`) e la banda resta libera per le righe delle altre mod. La banda viene usata solo come ripiego quando il terminale non può collocare il pannello.

Il resto del codice è invariato. La modifica è segnalata anche nel sorgente, in `hooks/replay-theater.mjs`.

## Utilizzo

- `/replay` — apre il pannello sull'ultimo turno che ha modificato file.
- `n` / `p` — passo successivo / precedente.
- `c` o `Esc` — chiude il pannello.

Limiti, dettagli di implementazione e schermate sono descritti nel [README originale](https://github.com/anthropics/claude-code-playground/blob/main/claude-code/mods/replay-theater/README.md).

## Licenza

Apache-2.0 — vedi [`LICENSE`](./LICENSE). Copyright dell'opera originale: Anthropic, PBC. Non è un prodotto ufficiale Anthropic.
