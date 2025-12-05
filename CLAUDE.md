# CLAUDE.md - Studieplanlegger

> **Kontekst for Claude Code**
> **Sist oppdatert:** 2025-12-05 (vg1Valg, fremmedspråk-filtrering, fellesProgramfag)

## Prosjektbeskrivelse

Interaktiv studieplanlegger-widget for videregående skoler. Elevene velger programfag for VG2/VG3 via blokkskjema, med automatisk validering av fordypningskrav og regelsjekk.

**GitHub:** https://github.com/fredeids-metis/studieplanlegger

---

## KRITISK: Dataflyt og Arkitektur

### School-data er master for ALL data

```
┌─────────────────────────────────────────────────────────────────┐
│  SCHOOL-DATA (separat repo)         /Users/fredrik/.../school-data
│  ═══════════════════════════════════════════════════════════════
│
│  data/udir/           → Nasjonale regler, fag, timefordeling
│  data/skoler/{skole}/ → Blokkskjema, tilbud, school-config
│
│  scripts/build-api-v2.js → Bygger komplett JSON
│  docs/api/v2/...         → Generert output → GitHub Pages
└─────────────────────────────────────────────────────────────────┘
                              ↓ fetch()
┌─────────────────────────────────────────────────────────────────┐
│  STUDIEPLANLEGGER (dette repo)                                  │
│  ═══════════════════════════════════════════════════════════════
│
│  data-handler.js  → Henter fra API, cacher i minne
│  state.js         → Brukervalg (VG1/VG2/VG3 selections)
│  validation-service.js → Validerer mot regler fra API
│  ui-renderer.js   → Tegner UI basert på data + state
└─────────────────────────────────────────────────────────────────┘
```

### API-endepunkt

```
https://fredeids-metis.github.io/school-data/api/v2/schools/{skole}/studieplanlegger.json
```

### Datastruktur fra API (forenklet)

```javascript
{
  blokkskjema: {
    activeVersion: "26-27_flex",
    descriptions: { "26-27_flex": "Beskrivelse..." },
    versions: {
      "26-27_flex": {
        blokker: {
          blokk1: { navn, fag: [{ id, timer, trinn, tilgjengeligFor }] },
          blokk2: { ... }
        }
      }
    }
  },

  fellesfag: {
    vg1: { totalt: 842, fag: [...] },  // NB: { fag: [...] } ikke direkte array
    vg2: { totalt: 477, fag: [...] },
    vg3: { totalt: 393, fag: [...] }
  },

  // VG1-valg: Matematikk og fremmedspråk som velges i blokkskjema
  vg1Valg: {
    matematikk: [
      { id: "matematikk-1p", title: "Matematikk 1P", timer: 140 },
      { id: "matematikk-1t", title: "Matematikk 1T", timer: 140 }
    ],
    fremmedsprak: {
      // Filtrert basert på skolens tilbud.yml -> fremmedsprakTilbud
      harFremmedsprak: [
        { id: "spansk-1", title: "Spansk I", timer: 113 },
        { id: "spansk-2", title: "Spansk II", timer: 113 },
        // ... andre språk skolen tilbyr
      ],
      ikkeHarFremmedsprak: [
        { id: "spansk-1-2", title: "Spansk I+II", timer: 225 }
      ]
    }
  },

  // Obligatoriske programfag (for Musikk, Medier etc.)
  fellesProgramfag: {
    "musikk-dans-drama": {
      vg1: { fag: [...] },
      vg2: { fag: [...] },
      vg3: { fag: [...] }
    },
    "medier-kommunikasjon": { ... }
  },

  regler: {
    eksklusjoner: [...],    // Fag som ikke kan kombineres
    forutsetninger: [...],  // Fag som krever andre fag først
    fagomrader: {...},      // For fordypningsberegning
    fordypning: {...}       // Krav per program
  },

  curriculum: {
    valgfrieProgramfag: [...],
    obligatoriskeProgramfag: [...],
    fellesfag: [...]
  }
}
```

### Når endres data?

| Endring | Hvor | Rebuild |
|---------|------|---------|
| Fag-beskrivelse | school-data/data/udir/fag/ | `npm run build:v2` i school-data |
| Blokkskjema | school-data/data/skoler/{skole}/blokkskjema/ | `npm run build:v2` i school-data |
| Regler | school-data/data/udir/regler/ | `npm run build:v2` i school-data |
| UI/logikk | studieplanlegger/src/ | Automatisk (dev server) |

**Full dokumentasjon av datastrukturer:** Se `/Users/fredrik/Documents/school-data/CLAUDE.md`

---

## Lokal Testing - Hurtigreferanse

### Start utviklingsmiljø

```bash
# Terminal 1: Studieplanlegger (port 8000)
cd /Users/fredrik/Documents/studieplanlegger
npm run dev

# Terminal 2: School-data API (port 8001) - kun ved lokal API-testing
cd /Users/fredrik/Documents/school-data
python3 -m http.server 8001 --directory docs
```

### Test-URL

```
http://localhost:8000/public/demo.html              # Normal
http://localhost:8000/public/demo.html?admin=true   # Med versjonsbytter
```

### Typisk arbeidsflyt

1. **Start servere** (Claude gjør dette automatisk ved behov)
2. **Åpne nettleser** på demo.html
3. **Gi tilbakemelding** - beskriv hva som skjer vs. forventet
4. **Claude fikser** - committer og sier "refresh"
5. **Hard refresh** (Ctrl+Shift+R) og test igjen

### Ved feil: Sjekkliste

```javascript
// I browser console:
window.studieplanlegger.dataHandler.data    // Se rå API-data
window.studieplanlegger.state.getState()    // Se brukervalg
window.studieplanlegger.validator           // Se valideringsregler
```

---

## Viktige Regler (Domenelogikk)

### Studiespesialisering = ÉTT programområde
UDIR deler formelt i "Realfag" og "Språk, samfunnsfag og økonomi", men vi behandler det som ETT område.

### Fordypningskrav
- **1 fordypning = 2 fag fra samme fagområde** (f.eks. Fysikk 1 + Fysikk 2)
- **Krav: 2 fordypninger totalt** (VG2 + VG3 kombinert)

### Matematikk
- R-linja og S-linja kan **IKKE** kombineres
- R1 i VG2 + S2 i VG3 = **BLOKKERT**
- **VG1:** Velger mellom 1P og 1T
- **VG2:** 2P er standard, MEN R1/S1 erstatter 2P (velges i blokkskjema)

### VG1-valg (matematikk og fremmedspråk)
Disse fagene er "fellesfag" men velges aktivt i blokkskjema:
- **Matematikk:** 1P eller 1T
- **Fremmedspråk:** Avhengig av om eleven har hatt fremmedspråk på ungdomsskolen

### Fremmedspråk (UDIR-regler)
- **HAR fremmedspråk fra ungdomsskolen:** Kan velge Nivå I (nytt språk) ELLER Nivå II (fortsette)
- **IKKE fremmedspråk fra ungdomsskolen:** MÅ ta Nivå I+II over 3 år
- **Skolefiltrering:** Hvilke språk tilgjengelig styres av `tilbud.yml -> fremmedsprakTilbud`

### Fellesfag som IKKE vises i fellesfag-listen
Disse velges i blokkskjema og skal IKKE vises i "automatisk fellesfag"-listen:
- VG1: matematikk (1P/1T), fremmedspråk
- VG2: matematikk 2P (kan erstattes av R1/S1)

### Obligatoriske fag
- **VG3:** Historie er obligatorisk

---

## Prosjektstruktur

```
src/
├── studieplanlegger.js     # Hovedklasse, modal-håndtering
├── core/
│   ├── data-handler.js     # API-henting, data-tilgang
│   ├── state.js            # Brukervalg, selections[]
│   └── validation-service.js
└── ui/
    └── ui-renderer.js      # HTML-generering

public/
├── demo.html               # Lokal testing
└── embed.html              # Squarespace embed

styles/
└── studieplanlegger.css
```

---

## State-struktur

```javascript
state = {
  programomrade: 'studiespesialisering',
  harFremmedsprak: true,

  vg1: { selections: [{ id, navn, timer, fagkode, slot }] },
  vg2: { selections: [{ id, navn, timer, fagkode, slot, blokkId }] },
  vg3: { selections: [{ id, navn, timer, fagkode, slot, blokkId }] }
}
```

**Viktig:** Bruk `state.setTrinnSelections(trinn, selections)` - håndterer slot-tildeling automatisk.

---

## Vanlige Feil og Løsninger

### "Cannot read property 'filter' of undefined"
**Årsak:** API-strukturendring. Sjekk at koden håndterer begge formater:
```javascript
// Ny: { fag: [...] }  |  Gammel: [...]
const fagArray = Array.isArray(data) ? data : (data.fag || []);
```

### Fag vises ikke i modal
**Sjekk:**
1. Faget har riktig `trinn` og `tilgjengeligFor` i blokkskjema
2. Programområde-filter matcher

### Fordypning teller ikke
**Sjekk:** Faget er lagt til i riktig `fagomrade` i `regler/fordypning.yml`

---

## Commit-konvensjon

```
Type: Kort beskrivelse

- Detaljer
- Detaljer

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

Typer: `Fix:`, `Feature:`, `Refactor:`, `Docs:`, `Style:`
