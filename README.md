# claude-code-mods

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](./LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-%E2%89%A5_2.1.287-d97757?style=flat)](https://code.claude.com/docs/en/plugins/mods/overview)
[![Mods](https://img.shields.io/badge/Mods-4-3178c6?style=flat)](#le-quattro-mod)

**claude-code-mods** è un marketplace di mod per Claude Code che ti permette di aggiungere all'interfaccia una barra della prompt cache, i prossimi passi a fine turno, un pannello di bottoni rapidi e il replay delle modifiche. Ogni mod è un plugin indipendente, installabile singolarmente con un comando.

---

## Le quattro mod

**⏳ cache-meter** — una riga sopra il prompt con una barra che si svuota nel tempo: indica quanto resta dell'ora di prompt cache dall'ultima richiesta della conversazione principale. Verde oltre i 20 minuti, gialla oltre i 5, rossa sotto; allo scadere segnala che la richiesta successiva riscriverà la cache. Le richieste dei subagent non rinnovano la barra, perché usano una cache separata.

**➡️ next-steps** — a fine turno propone sopra il prompt due bottoni con i prossimi passi più naturali della conversazione, più un terzo bottone Replay. Premendo un passo, il prompt corrispondente viene inviato come se lo avessi scritto tu. I passi sono generati con una richiesta al modello a ogni fine turno, che consuma token.

**🎛️ quick-buttons** — un pannello laterale con un bottone per ogni comando ricorrente (`/commit`, `/handoff`, `/wayfinder`, `/replay`). Il pannello mostra solo i comandi presenti nella tua sessione: un comando assente non genera un bottone.

**⏪ replay-theater** — registra le modifiche ai file dell'ultimo turno e le mostra in un pannello, un diff alla volta. È una variante della mod di esempio pubblicata da Anthropic in [claude-code-playground](https://github.com/anthropics/claude-code-playground), distribuita con licenza Apache-2.0; le differenze sono descritte in [`replay-theater/README.md`](./replay-theater/README.md).

---

## Prerequisiti

- **Claude Code 2.1.287 o successivo** — le mod sono attive di default da questa versione. Verifica con `claude --version`.
- **Terminale o tab Code dell'app Desktop** — le sessioni WSL nell'app Desktop non eseguono le mod.

Una mod è codice eseguito con i tuoi permessi: può leggere e scrivere file, avviare processi e vedere prompt e tool call della sessione. Il sorgente di ogni mod è in `hooks/`, poche decine di righe: leggilo prima dell'installazione.

---

## Installazione

1. Aggiungi il marketplace a Claude Code:

   ```bash
   claude plugin marketplace add DarioFontanel/claude-code-mods
   ```

2. Installa le mod che ti interessano, una per comando:

   ```bash
   claude plugin install cache-meter@dario-mods
   claude plugin install next-steps@dario-mods
   claude plugin install quick-buttons@dario-mods
   claude plugin install replay-theater@dario-mods
   ```

   `next-steps` dichiara `replay-theater` come dipendenza: installandola, `replay-theater` viene installata automaticamente.

3. Avvia una nuova sessione con `claude`.

Verifica: apri `/plugin` — sotto i tab compare la riga con le mod attive, ad esempio `4 mods active`.

Gli stessi comandi sono disponibili dall'interno di una sessione come `/plugin marketplace add` e `/plugin install`. Per provare una mod in una sola sessione senza installarla, clona la repo e avvia `claude --plugin-dir ./claude-code-mods/cache-meter`.

Per disattivare una mod, disabilitala o disinstallala dal tab **Installed** di `/plugin`.

---

## Comandi disponibili

- `/replay` — apre il pannello di replay sull'ultimo turno che ha modificato file. Nel pannello: `n` passo successivo, `p` passo precedente, `c` o `Esc` chiusura.
- `/azioni` — apre il pannello di quick-buttons. Su un terminale di almeno 144 colonne il pannello si apre da solo all'avvio della sessione. Tasti rapidi: `c` Commit, `h` Handoff, `w` Wayfinder, `x` Replay.
- `ctrl+x` poi `Tab` — sposta il focus sulla banda sopra il prompt. Da lì `1` e `2` inviano i passi proposti da next-steps, `3` apre il replay.

---

## Personalizzazione

**Bottoni di quick-buttons** — l'elenco è la costante `ACTIONS` in `quick-buttons/hooks/register.js`: ogni voce indica il comando da lanciare, l'etichetta e il tasto rapido. `/handoff` e `/wayfinder` sono skill personali dell'autore; sostituiscile con i comandi che usi più spesso.

**Durata della cache in cache-meter** — la costante `TTL_MS` in `cache-meter/hooks/register.js` vale un'ora, la durata della prompt cache negli abbonamenti Claude. Se la tua cache dura 5 minuti, imposta `5 * 60 * 1000`.

**Lingua di next-steps** — la richiesta al modello è la costante `ASK` in `next-steps/hooks/register.tsx`. I prompt proposti seguono la lingua della conversazione.

Per modificare una mod, clona la repo e caricala con `claude --plugin-dir`: ogni salvataggio ricarica il modulo nella sessione aperta.

---

## Struttura del progetto

```
claude-code-mods/
├── .claude-plugin/marketplace.json   # elenco delle mod installabili
├── cache-meter/
├── next-steps/
├── quick-buttons/
└── replay-theater/                   # Apache-2.0, con LICENSE propria
```

Ogni cartella è un plugin completo:

- `.claude-plugin/plugin.json` — nome, versione e descrizione.
- `hooks/hooks.json` — il modulo da caricare.
- `hooks/register.*` — gli hook della mod.
- `tests/` — i test, eseguibili con `claude plugin test ./<mod>`.

`claude plugin validate ./<mod>` elenca gli eventi intercettati e le chiamate al motore di ciascuna mod.

---

Designed by **[Dario Fontanel, PhD](https://dariofontanel.com/)**

*Aiuto PMI italiane ad integrare l'intelligenza artificiale per automatizzare i lavori ripetitivi, abbattere i costi e guadagnare tempo per crescere.*

[![Sito](https://img.shields.io/badge/Sito-dariofontanel.com-4285F4?style=flat&logo=googlechrome&logoColor=white)](https://dariofontanel.com/)
[![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=flat&logo=youtube&logoColor=white)](https://www.youtube.com/@dariofontanel)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=flat&logo=instagram&logoColor=white)](https://www.instagram.com/dariofontanel.ai/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=flat&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI%2BPHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0yMC40NDcgMjAuNDUyaC0zLjU1NHYtNS41NjljMC0xLjMyOC0uMDI3LTMuMDM3LTEuODUyLTMuMDM3LTEuODUzIDAtMi4xMzYgMS40NDUtMi4xMzYgMi45Mzl2NS42NjdIOS4zNTFWOWgzLjQxNHYxLjU2MWguMDQ2Yy40NzctLjkgMS42MzctMS44NSAzLjM3LTEuODUgMy42MDEgMCA0LjI2NyAyLjM3IDQuMjY3IDUuNDU1djYuMjg2ek01LjMzNyA3LjQzM2MtMS4xNDQgMC0yLjA2My0uOTI2LTIuMDYzLTIuMDY1IDAtMS4xMzguOTItMi4wNjMgMi4wNjMtMi4wNjMgMS4xNCAwIDIuMDY0LjkyNSAyLjA2NCAyLjA2MyAwIDEuMTM5LS45MjUgMi4wNjUtMi4wNjQgMi4wNjV6bTEuNzgyIDEzLjAxOUgzLjU1NVY5aDMuNTY0djExLjQ1MnpNMjIuMjI1IDBIMS43NzFDLjc5MiAwIDAgLjc3NCAwIDEuNzI5djIwLjU0MkMwIDIzLjIyNy43OTIgMjQgMS43NzEgMjRoMjAuNDUxQzIzLjIgMjQgMjQgMjMuMjI3IDI0IDIyLjI3MVYxLjcyOUMyNCAuNzc0IDIzLjIgMCAyMi4yMjUgMHoiLz48L3N2Zz4%3D)](https://www.linkedin.com/in/dario-fontanel/)
[![TikTok](https://img.shields.io/badge/TikTok-000000?style=flat&logo=tiktok&logoColor=white)](https://www.tiktok.com/@dario.fontanel)
[![AI Academy](https://img.shields.io/badge/AI_Academy-E7514F?style=flat&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI%2BPHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAzIDEgOWwxMSA2IDktNC45MVYxN2gyVjlMMTIgM3pNNSAxMy4xOFYxN2MwIDEuNjYgMy4xMyAzIDcgM3M3LTEuMzQgNy0zdi0zLjgybC03IDMuODItNy0zLjgyeiIvPjwvc3ZnPg%3D%3D)](https://www.skool.com/ai-academy-2306)

Licenza: [MIT](./LICENSE) — `replay-theater` è distribuita con licenza [Apache-2.0](./replay-theater/LICENSE).
