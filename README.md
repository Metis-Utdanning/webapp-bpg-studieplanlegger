# Studieplanlegger

Interaktiv studieplanlegger-widget for Bergen Private Gymnas. Henter all data fra school-data API.

## Funksjoner

- Velg programfag for VG2 og VG3 via blokkskjema
- Automatisk validering av fordypningskrav
- Matematikk R/S-linje konfliktsjekk
- Støtte for fremmedspråk-unntak

## Komme i gang

```bash
npm run dev  # Start lokal server
```

Åpne: http://localhost:8000/public/demo.html

## Datakilde

All fagdata hentes fra [school-data](https://github.com/fredeids-metis/school-data) API:

```
https://fredeids-metis.github.io/school-data/api/v2/schools/bergen-private-gymnas/studieplanlegger.json
```

## Innbygging

Se `public/embed.html` for Squarespace embed-kode. Filer serveres via jsDelivr CDN.

## Prosjektstruktur

```
studieplanlegger/
├── src/
│   ├── core/
│   │   ├── state.js              # State management
│   │   ├── data-handler.js       # API loading
│   │   └── validation-service.js # Validering
│   └── studieplanlegger.js       # Hovedinngang
├── styles/                       # CSS
├── public/
│   ├── demo.html                 # Lokal demo
│   └── embed.html                # Squarespace embed
└── docs/                         # Dokumentasjon
```

## Lisens

MIT
