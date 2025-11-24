# Studieplanlegger

Interaktiv studieplanlegger for videregående skole (VG1-VG3) - Bergen Private Gymnas.

## Komme i gang

### 1. Installer dependencies
```bash
npm install
```

### 2. Bygg API
```bash
npm run build
```

Dette genererer `dist/api/v2/studieplanlegger.json` fra YAML og markdown-kilder.

### 3. Start lokal server
```bash
npm run dev
```

Åpne: http://localhost:8000/public/demo.html

## Prosjektstruktur

```
studieplanlegger/
├── data/                   # Master curriculum data
│   ├── curriculum/
│   │   ├── master-lists/   # TXT-filer fra UDIR
│   │   ├── markdown/       # 80 markdown-filer (curriculum)
│   │   └── regler.yml      # Valideringsregler
│   └── schools/
│       └── bergen-private-gymnas/
│           ├── school-config.yml
│           ├── timefordeling.yml
│           └── blokkskjema_v2.yml
│
├── src/                    # App source code
│   ├── core/               # Business logic
│   │   ├── state.js
│   │   ├── data-handler.js
│   │   └── validation-service.js
│   ├── ui/                 # UI components
│   │   └── ui-renderer.js
│   └── studieplanlegger.js # Main entry
│
├── styles/                 # CSS
│   ├── base.css
│   ├── brand.css
│   ├── studieplanlegger.css
│   └── components/
│       └── modal.css
│
├── scripts/                # Build scripts
│   ├── build-api.js        # Bygger JSON API
│   └── fetch-curriculum.sh # Henter fra UDIR
│
├── public/                 # Static files
│   └── demo.html           # Demo page
│
└── dist/                   # Build output (generated)
    └── api/
        └── v2/
            └── studieplanlegger.json
```

## Utvikling

### Oppdatere data fra UDIR
```bash
npm run fetch:all
```

Dette henter oppdatert curriculum-data fra UDIR Grep API.

### Rebuild API
```bash
npm run build
```

Kjør etter endringer i YAML-filer eller markdown.

## Deploy

Deploy til GitHub Pages (kommer):
```bash
npm run deploy
```

## Dokumentasjon

Se `docs/` for mer dokumentasjon:
- `GETTING_STARTED.md` - Komme i gang
- `DATA_FLOW.md` - Hvordan data flyter gjennom systemet
- `API_REFERENCE.md` - API-dokumentasjon

## Lisens

MIT
