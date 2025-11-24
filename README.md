# Studieplanlegger

Interaktiv studieplanlegger for videregående skole (VG1-VG3) - Bergen Private Gymnas.

## Funksjoner

- Velg programfag for VG2 og VG3 via blokkskjema
- Automatisk validering av fordypningskrav (2 fag fra samme fagområde = 1 fordypning)
- Matematikk R/S-linje konfliktsjekk
- Støtte for fremmedspråk-unntak (Spansk I+II)
- Responsivt design for desktop og mobil

## Komme i gang

### 1. Installer dependencies
```bash
npm install
```

### 2. Bygg API
```bash
npm run build
```

### 3. Start lokal server
```bash
npm run dev
```

Åpne: http://localhost:8000/public/demo.html

## Innbygging på Squarespace

Kopier innholdet fra `public/embed.html` inn i en Squarespace Code Block:

```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fredeids-metis/studieplanlegger@main/styles/base.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fredeids-metis/studieplanlegger@main/styles/brand.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fredeids-metis/studieplanlegger@main/styles/components/modal.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fredeids-metis/studieplanlegger@main/styles/studieplanlegger.css">

<!-- Container -->
<div id="studieplanlegger"></div>

<!-- JavaScript -->
<script type="module">
  import { Studieplanlegger } from 'https://cdn.jsdelivr.net/gh/fredeids-metis/studieplanlegger@main/src/studieplanlegger.js';

  const app = new Studieplanlegger(
    document.getElementById('studieplanlegger'),
    {
      schoolId: 'bergen-private-gymnas',
      apiBaseUrl: 'https://cdn.jsdelivr.net/gh/fredeids-metis/studieplanlegger@main/dist/api/v2',
      apiVersion: 'v2'
    }
  );
</script>
```

**Viktig:** Kjør `npm run build` og push til GitHub før embed fungerer.

## Prosjektstruktur

```
studieplanlegger/
├── data/                   # Curriculum data
│   ├── curriculum/
│   │   ├── markdown/       # Fagbeskrivelser (80 filer)
│   │   └── regler.yml      # Valideringsregler
│   └── schools/
│       └── bergen-private-gymnas/
│           └── blokkskjema_v2.yml
│
├── src/                    # App source
│   ├── core/
│   │   ├── state.js        # State management
│   │   ├── data-handler.js # API loading
│   │   └── validation-service.js
│   └── studieplanlegger.js # Main entry
│
├── styles/                 # CSS
├── public/
│   ├── demo.html           # Lokal demo
│   └── embed.html          # Squarespace embed-kode
└── dist/                   # Build output
```

## Utvikling

```bash
# Oppdater data fra UDIR
npm run fetch:all

# Rebuild API etter endringer
npm run build

# Start dev server
npm run dev
```

## Lisens

MIT
