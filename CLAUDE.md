# CLAUDE.md - Studieplanlegger

> **Kontekst for Claude Code**
> **Sist oppdatert:** 2024-11-24

## Prosjektbeskrivelse

Interaktiv studieplanlegger-widget for Bergen Private Gymnas. Elevene velger programfag for VG2 og VG3 via blokkskjema, og får automatisk validering av fordypningskrav.

**GitHub:** https://github.com/fredeids-metis/studieplanlegger

## Viktige Regler

### Studiespesialisering = ÉTT programområde
Selv om UDIR formelt deler studiespesialisering i "Realfag" og "Språk, samfunnsfag og økonomi", behandler vi det som ETT område. Grunnen er at UDIR har foreslått å slå disse sammen.

### Fordypningskrav
- **1 fordypning = 2 fag fra samme fagområde**
- **Krav: 2 fordypninger totalt** (VG2 + VG3 kombinert)
- Eksempel: Fysikk 1 + Fysikk 2 = 1 fordypning
- Eksempel: Kjemi 1 + Kjemi 2 = 1 fordypning

### Matematikk
- R-linja og S-linja kan IKKE kombineres
- R1 → R2 eller S1 → S2 er OK
- R1 i VG2 + S2 i VG3 = BLOKKERT

### Obligatoriske fag
- **VG3:** Historie er obligatorisk fellesfag
- **Fremmedspråk:** Elever uten fremmedspråk fra ungdomsskolen MÅ ta Spansk I+II

## Prosjektstruktur

```
studieplanlegger/
├── data/curriculum/        # Fagdata og regler
│   ├── regler.yml          # Valideringsregler (SINGLE SOURCE OF TRUTH)
│   └── markdown/           # Fagbeskrivelser
├── data/schools/           # Skole-spesifikk config
│   └── bergen-private-gymnas/
│       └── blokkskjema_v2.yml
├── src/
│   ├── studieplanlegger.js # Hovedinngang, modal-håndtering
│   └── core/
│       ├── state.js        # State management (unified selections[])
│       ├── validation-service.js
│       └── data-handler.js
├── public/
│   ├── demo.html           # Lokal testing
│   └── embed.html          # Squarespace embed-kode
└── dist/api/               # Generert JSON API
```

## State Struktur

```javascript
state = {
  programomrade: 'studiespesialisering',
  harFremmedsprak: true/false,

  vg2: {
    selections: [
      { id, navn, timer, fagkode, type, slot: 'matematikk', blokkId },
      { id, navn, timer, fagkode, type, slot: 'programfag-1', blokkId },
      { id, navn, timer, fagkode, type, slot: 'programfag-2', blokkId },
      { id, navn, timer, fagkode, type, slot: 'programfag-3', blokkId }
    ]
  },

  vg3: {
    selections: [
      { id, navn, timer, fagkode, type, slot: 'historie', blokkId },
      { id, navn, timer, fagkode, type, slot: 'programfag-1', blokkId },
      { id, navn, timer, fagkode, type, slot: 'programfag-2', blokkId },
      { id, navn, timer, fagkode, type, slot: 'programfag-3', blokkId }
    ]
  }
}
```

**Viktig:** Bruk `setTrinnSelections(trinn, selections)` for å lagre fag - denne håndterer automatisk slot-tildeling.

## Vanlige Kommandoer

```bash
npm run dev      # Start dev server (http://localhost:8000/public/demo.html)
npm run build    # Rebuild API fra YAML/markdown
npm run fetch:all # Oppdater data fra UDIR
```

## Testing

Test disse scenarioene:

1. **VG2 Studiespesialisering:** Velg 4 fag (1 matematikk + 3 programfag)
2. **VG3 Studiespesialisering:** Velg 4 fag (Historie + 3 programfag)
3. **Fordypning:** Velg 2 fag fra samme fagområde → se fordypning telle opp
4. **Matematikk-konflikt:** R1 i VG2, prøv S2 i VG3 → skal blokkeres
5. **Fremmedspråk NEI:** Spansk I+II skal auto-velges i VG3

## Filer å Lese Ved Endringer

- `data/curriculum/regler.yml` - Valideringsregler
- `src/core/state.js` - State og setTrinnSelections()
- `src/core/validation-service.js` - Fordypning og konflikter
- `src/studieplanlegger.js` - Modal-håndtering

## Debugging

```javascript
// I browser console:
window.studieplanlegger.state.getState()  // Se state
window.studieplanlegger.validator         // Se validator
```

## Innbygging

Se `public/embed.html` for Squarespace embed-kode. Filer serveres via jsDelivr CDN direkte fra GitHub.

## Masterdata-kilder (UDIR)

- https://www.udir.no/regelverkstolkninger/opplaring/Innhold-i-opplaringen/udir-1-2025/
- https://www.udir.no/eksamen-og-prover/dokumentasjon/vitnemal-og-kompetansebevis/foring-vitnemal-kompetansebevis-vgs-25/
