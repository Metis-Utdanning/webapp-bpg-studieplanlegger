# CLAUDE.md - Studieplanlegger

> **Kontekst for Claude Code**
> **Sist oppdatert:** 2025-12-05

## Prosjektbeskrivelse

Interaktiv studieplanlegger-widget for Bergen Private Gymnas. Elevene velger programfag for VG2 og VG3 via blokkskjema, og får automatisk validering av fordypningskrav.

**GitHub:** https://github.com/fredeids-metis/studieplanlegger

## API-arkitektur

### Datakilder
Appen henter data fra **school-data** prosjektet via GitHub Pages API:

```
Base URL: https://fredeids-metis.github.io/school-data/api/
Endepunkt: /v2/schools/{skole}/studieplanlegger.json
```

### Dataflyt
```
school-data/data/udir/          → Nasjonale regler (eksklusjoner, forutsetninger, fordypning)
school-data/data/skoler/{skole}/ → Skolespesifikk config (blokkskjema, tilbud)
           ↓
school-data/scripts/build-api-v2.js  → Bygger komplett JSON
           ↓
Studieplanlegger (data-handler.js)   → Henter og cacher data
```

### Blokkskjema-versjoner
- Versjoner navngis: `{skoleår}_{variant}.yml` (f.eks. `26-27_flex.yml`)
- Flere versjoner kan eksistere samtidig
- Aktiv versjon settes i `school-config.yml`
- Runtime-veksling via URL: `?blokkskjema=26-27_flex` eller `?admin=true`

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
├── src/
│   ├── studieplanlegger.js     # Hovedinngang, modal-håndtering
│   ├── core/
│   │   ├── state.js            # State management (unified selections[])
│   │   ├── validation-service.js
│   │   └── data-handler.js     # API-henting og caching
│   └── ui/
│       └── ui-renderer.js      # UI-rendering
├── public/
│   ├── demo.html               # Lokal testing
│   ├── embed.html              # Squarespace embed-kode
│   └── images/fag/             # Fagbilder (fysikk-1.jpg, etc.)
├── styles/
│   └── studieplanlegger.css
├── docs/                       # Dokumentasjon
│   └── CHANGELOG.md
└── dist/                       # Bygget output
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
```

## Testing

Test disse scenarioene:

1. **VG2 Studiespesialisering:** Velg 4 fag (1 matematikk + 3 programfag)
2. **VG3 Studiespesialisering:** Velg 4 fag (Historie + 3 programfag)
3. **Fordypning:** Velg 2 fag fra samme fagområde → se fordypning telle opp
4. **Matematikk-konflikt:** R1 i VG2, prøv S2 i VG3 → skal blokkeres
5. **Fremmedspråk NEI:** Spansk I+II skal auto-velges i VG3
6. **Versjonsbytting:** `?admin=true` → bytt mellom blokkskjema-versjoner

## Filer å Lese Ved Endringer

- `src/core/data-handler.js` - API-henting og datastrukturer
- `src/core/state.js` - State og setTrinnSelections()
- `src/core/validation-service.js` - Fordypning og konflikter
- `src/studieplanlegger.js` - Modal-håndtering

## Debugging

```javascript
// I browser console:
window.studieplanlegger.state.getState()      // Se state
window.studieplanlegger.validator             // Se validator
window.studieplanlegger.dataHandler           // Se data-handler
window.studieplanlegger.dataHandler.getAvailableVersions()  // Liste versjoner
```

## Innbygging

Se `public/embed.html` for Squarespace embed-kode. Filer serveres via jsDelivr CDN direkte fra GitHub.

## Relaterte Prosjekter

- **school-data**: Masterdata og API - `/Users/fredrik/Documents/school-data/`
  - Se `CLAUDE.md` i school-data for full dokumentasjon av datastrukturer

## Masterdata-kilder (UDIR)

- https://www.udir.no/regelverkstolkninger/opplaring/Innhold-i-opplaringen/udir-1-2025/
- https://www.udir.no/eksamen-og-prover/dokumentasjon/vitnemal-og-kompetansebevis/foring-vitnemal-kompetansebevis-vgs-25/
