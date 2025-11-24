# CLAUDE.md - Studieplanlegger App

> **Kontekst-dokument for Claude Code**
> **Dato:** 2024-11-24
> **Status:** Monorepo setup ✅ FULLFØRT | Refaktorering 🔜 NESTE

---

## 🎯 Prosjektets Mål

**Hovedmål:** Fullføre en fungerende Studieplanlegger-app for Bergen Private Gymnas med **komplett og korrekt validering** av elevers fagvalg.

**Tilnærming:** Samle alt i ÉTT monorepo (data + app) for raskere utvikling. Droppe unødvendig kompleksitet. Fokusere 100% på studieplanlegger.

---

## ✅ Hva er gjort (oppsummering)

### Arkitektur-analyse fullført
- Identifisert 9 kritiske problemer i eksisterende system
- Se `/Users/fredrik/Documents/school-data-project/REFAKTORERINGSPLAN.md`
- Se `/Users/fredrik/Documents/school-data-project/MONOREPO_PLAN.md`

### Monorepo setup fullført
- ✅ GitHub repo: https://github.com/fredeids-metis/studieplanlegger
- ✅ 103 filer kopiert og commitet
- ✅ Mappestruktur opprettet (data/ src/ styles/ scripts/)
- ✅ 80 curriculum markdown-filer
- ✅ Bergen Private Gymnas configs (blokkskjema_v2, timefordeling, school-config)
- ✅ Studieplanlegger widget (5 JS-moduler, 4 CSS-filer)
- ✅ Import paths oppdatert til ny struktur
- ✅ Build pipeline fungerer (`npm run build` → 149KB JSON)
- ✅ package.json med scripts
- ✅ demo.html for lokal testing

**Commit:** `2988f54` - "Initial monorepo setup - Studieplanlegger app"

---

## 📁 Prosjektstruktur

```
/Users/fredrik/Documents/studieplanlegger/
├── data/
│   ├── curriculum/
│   │   ├── master-lists/              # TXT-filer fra UDIR (3 stk)
│   │   │   ├── valgfrie-programfag_lk20.txt
│   │   │   ├── obligatoriske-programfag_lk20.txt
│   │   │   └── fellesfag_lk20.txt
│   │   ├── markdown/                  # Curriculum markdown (80 filer)
│   │   │   ├── valgfrie-programfag/   (34 filer)
│   │   │   ├── obligatoriske-programfag/ (16 filer)
│   │   │   └── fellesfag/             (30 filer)
│   │   └── regler.yml                 # Valideringsregler (VIKTIG!)
│   └── schools/
│       └── bergen-private-gymnas/
│           ├── school-config.yml
│           ├── timefordeling.yml
│           └── blokkskjema_v2.yml
│
├── src/                               # App source (ES6 modules)
│   ├── core/
│   │   ├── state.js                  # State management
│   │   ├── data-handler.js           # API data loading
│   │   └── validation-service.js     # Validation logic
│   ├── ui/
│   │   └── ui-renderer.js            # UI rendering
│   └── studieplanlegger.js           # Main entry (exports Studieplanlegger class)
│
├── styles/                            # CSS
│   ├── base.css                      # CSS variables
│   ├── brand.css                     # BPG colors
│   ├── studieplanlegger.css          # Widget styling
│   └── components/
│       └── modal.css
│
├── scripts/                           # Build scripts
│   ├── build-api.cjs                 # Bygger JSON API (CommonJS)
│   └── fetch-curriculum.sh           # Henter fra UDIR Grep API
│
├── public/                            # Static files
│   └── demo.html                     # Lokal testing
│
├── dist/                              # Build output (generert)
│   └── api/v2/schools/bergen-private-gymnas/
│       └── studieplanlegger.json     # 149KB (everything in one endpoint)
│
├── docs/                              # (tom - klar for dokumentasjon)
│
├── til_claude.md                      # VIKTIGE BESLUTNINGER (les denne!)
├── package.json
├── README.md
└── .gitignore
```

---

## 🔑 Viktige Beslutninger

### 1. Studiespesialisering = ÉTT programområde

**Fra `til_claude.md`:**
> Selv om programområdet formelt sett er delt inn i "Realfag" (STREA2----/STREA3----) og "Språk, samfunnsfag og økonomi" (STSSA2----/STSSA3----), så ønsker jeg å IGNORERE dette og ta utgangspunkt i at programområdet "Studiespesialiserende" er ET programormåde.
>
> **Begrunnelse:** Det er foreslått å slå sammen disse programområdene til et fra neste år! (kilde: UDIR)

**Konsekvens:**
- ❌ DROPP hele programområde-splitting fra REFAKTORERINGSPLAN.md (Fase 2)
- ✅ Behold enkel fordypningsregel: 560t fra 2 fagområder (uavhengig av realfag vs språk)
- ✅ Forenkler valideringen kraftig!

### 2. Monorepo først, modularisering senere

- Start med alt samlet i ÉTT repo
- Lett å splitte ut senere hvis nødvendig (skole #2)
- Fokus: Komme i mål med studieplanlegger

### 3. Kun Bergen Private Gymnas

- Andre skoler droppes (foreløpig)
- Kun blokkskjema_v2.yml (v1 droppes)
- Kun API v2 (v1 droppes)

---

## 🚀 Neste Steg: Refaktorering

### Umiddelbare oppgaver

**1. Test at appen fungerer**
```bash
cd /Users/fredrik/Documents/studieplanlegger
npm run dev
# Åpne: http://localhost:8000/public/demo.html
```

**Forventede problemer:**
- API URL kanskje feil (sjekk console)
- Manglende felter i JSON
- Validering feiler

**2. Fiks akutte bugs** (hvis demo ikke fungerer)
- Sjekk at `dist/api/v2/schools/bergen-private-gymnas/studieplanlegger.json` finnes
- Verifiser at app loader JSON riktig
- Fiks import paths hvis noe mangler

**3. Refaktorer validering** (forenklet!)

Siden studiespesialisering er ÉTT område:

**Dropp fra REFAKTORERINGSPLAN.md:**
- ~~Fase 2.1: Utvid regler.yml med programomrader~~ (IKKE NØDVENDIG)
- ~~Fase 2.2: Legg til fagområde i TXT-filer~~ (KANSKJE SENERE)
- ~~Fase 3.3: Implementer programområde-validering~~ (FORENKLET)

**Behold fra REFAKTORERINGSPLAN.md:**
- ✅ Fase 1.1: Fiks fetch-curriculum.sh (kolonne 4 fra fellesfag_lk20.txt)
- ✅ Fase 3.2: Fjern hardcoded fallback i validation-service.js
- ✅ Fase 3.4: Fiks fordypningsberegning (bruk fagområde hvis mulig)
- ✅ Fase 4: Testing og dokumentasjon

**Forenklet fordypningsregel:**
```javascript
// Enkel regel: 560 timer fra 2+ fagområder
// Uavhengig av om det er realfag, språk, eller samfunnsfag
validateFordypning(selections) {
  const fagomrader = groupByFagomrade(selections);
  const totalTimer = sum(fagomrader.map(f => f.timer));
  const antallOmrader = fagomrader.length;

  return {
    valid: totalTimer >= 560 && antallOmrader >= 2,
    totalTimer,
    antallOmrader
  };
}
```

---

## 📊 Dataflyt (as-is)

```
1. UDIR Grep API (data.udir.no)
   ↓
2. fetch-curriculum.sh → Markdown files (80 stk)
   ↓
3. build-api.cjs → JSON API (studieplanlegger.json, 149KB)
   ↓
4. data-handler.js → Laster JSON
   ↓
5. validation-service.js → Validerer fagvalg
   ↓
6. ui-renderer.js → Viser UI med validering
```

---

## 🐛 Kjente Problemer (fra arkitektur-analyse)

### Kritiske (blokkerer korrekt validering)

1. **P1:** Programområde-info (kolonne 4) i fellesfag_lk20.txt går tapt
   - **Lokasjon:** scripts/fetch-curriculum.sh
   - **Fix:** Les kolonne 4, skriv til markdown frontmatter

2. **P2:** Program-felt mangler i fellesfag JSON API
   - **Lokasjon:** scripts/build-api.cjs
   - **Fix:** Inkluder program-felt fra frontmatter

3. **P5:** Hardcoded fallback i validation-service.js
   - **Lokasjon:** src/core/validation-service.js:100-153
   - **Fix:** Fjern _loadFallbackRules(), tvinge API-bruk (fail fast)

4. **P7:** Fordypning beregnes basert på læreplankode (burde bruke fagområde)
   - **Lokasjon:** src/core/validation-service.js:733-780
   - **Fix:** Gruppe fag per fagområde (ikke læreplankode)

### Lavere prioritet

5. **P3:** Duplikat program-info i tilbud.yml
   - Kan droppes siden vi ikke bruker tilbud.yml lenger

6. **P4:** Hardcoded validation rules i validation.js
   - Legacy-fil (sjekk om den brukes, slett hvis ikke)

7. **P8:** To parallelle valideringssystemer
   - Bruk kun validation-service.js

---

## 📚 Dokumenter å lese

### I denne mappen:
- `til_claude.md` - VIKTIG! Beslutning om studiespesialisering

### I gamle prosjekt-mappen:
- `/Users/fredrik/Documents/school-data-project/MONOREPO_PLAN.md` - Implementasjonsplan (FULLFØRT)
- `/Users/fredrik/Documents/school-data-project/REFAKTORERINGSPLAN.md` - Detaljert refaktoreringsplan (DELVIS RELEVANT - dropp Fase 2)
- `/Users/fredrik/Documents/school-data-project/PROSJEKTSTRUKTUR.md` - Gammel struktur (referanse)

### Masterdata-kilder (UDIR):
- https://www.udir.no/regelverkstolkninger/opplaring/Innhold-i-opplaringen/udir-1-2025/
- https://www.udir.no/eksamen-og-prover/dokumentasjon/vitnemal-og-kompetansebevis/foring-vitnemal-kompetansebevis-vgs-25/
- https://github.com/Utdanningsdirektoratet/KL06-LK20-public/wiki

---

## 🔧 Vanlige Kommandoer

```bash
# Utviklingsserver
npm run dev
# → http://localhost:8000/public/demo.html

# Rebuild API
npm run build

# Fetch oppdatert curriculum fra UDIR
npm run fetch:all

# Installer dependencies (hvis node_modules mangler)
npm install
```

---

## 🎨 State Struktur (refaktorert 2024-11-24)

Widgeten bruker **unified state structure**:

```javascript
state = {
  programomrade: 'studiespesialisering',
  harFremmedsprak: true/false,

  vg1: {
    selections: [
      { id, navn, timer, fagkode, type: 'fellesfag', slot: 'matematikk' },
      { id, navn, timer, fagkode, type: 'fellesfag', slot: 'fremmedsprak' }
    ]
  },

  vg2: {
    selections: [
      { id, navn, timer, fagkode, type: 'programfag', slot: 'matematikk' },
      { id, navn, timer, fagkode, type: 'programfag', slot: 'programfag-1' },
      { id, navn, timer, fagkode, type: 'programfag', slot: 'programfag-2' },
      { id, navn, timer, fagkode, type: 'programfag', slot: 'programfag-3' }
    ]
  },

  vg3: {
    selections: [
      { id, navn, timer, fagkode, type: 'fellesfag', slot: 'historie' },
      { id, navn, timer, fagkode, type: 'programfag', slot: 'programfag-1' },
      { id, navn, timer, fagkode, type: 'programfag', slot: 'programfag-2' },
      { id, navn, timer, fagkode, type: 'programfag', slot: 'programfag-3' }
    ]
  }
}
```

**Viktig:** Matematikk er nå i `selections[]` array (ikke separat felt).

---

## 🧪 Testing

Når appen fungerer, test disse scenarioene:

### Scenario 1: Gyldig studieplan (realfag)
- VG2: Matematikk R1, Fysikk 1, Kjemi 1 (420t)
- VG3: Matematikk R2, Fysikk 2 (280t)
- **Forventet:** ✅ Fordypning OK (700t fra 3 fagområder)

### Scenario 2: Gyldig studieplan (språk/samfunn)
- VG2: Matematikk S1, Samfunnsøkonomi 1, Historie og filosofi 1 (420t)
- VG3: Matematikk S2, Samfunnsøkonomi 2 (280t)
- **Forventet:** ✅ Fordypning OK (700t fra 3 fagområder)

### Scenario 3: Matematikk-konflikt
- VG2: Matematikk R1
- VG3: Matematikk S2 (feil løp!)
- **Forventet:** ❌ Konflikt (R vs S)

### Scenario 4: For lite fordypning
- VG2: Matematikk R1, Fysikk 1 (280t)
- VG3: Matematikk R2 (140t)
- **Forventet:** ❌ Kun 420t (trenger 560t)

### Scenario 5: Kun 1 fagområde
- VG2: Matematikk R1 (140t)
- VG3: Matematikk R2, Matematikk 2P (280t)
- **Forventet:** ❌ Kun 1 fagområde (trenger 2+)

---

## 💡 Tips for Refaktorering

### God praksis:
1. **Test etter hver endring** - kjør `npm run dev` ofte
2. **Én fil om gangen** - ikke endre flere moduler samtidig
3. **Commit ofte** - små, atomiske commits
4. **Console.log debugging** - åpne DevTools i browser
5. **Sjekk JSON API** - besøk http://localhost:8000/dist/api/v2/schools/bergen-private-gymnas/studieplanlegger.json

### Debugging-verktøy:
```javascript
// I browser console:
window.studieplanlegger         // Eksponert for debugging
window.studieplanlegger.state   // Se state
window.studieplanlegger.validator // Se validator

// Logger:
console.log(app.state.getState())
console.log(app.dataHandler.data)
console.log(app.validator.regler)
```

---

## 🚦 Status-sjekkliste

### Setup ✅
- [x] Monorepo opprettet
- [x] Filer kopiert
- [x] Import paths oppdatert
- [x] Build fungerer
- [x] Git commitet og pushet

### Testing 🔜
- [ ] Lokal demo fungerer (http://localhost:8000/public/demo.html)
- [ ] API lastes korrekt
- [ ] UI rendres uten feil
- [ ] Validering kjører (selv om den kanskje er feil)

### Refaktorering 🔜
- [ ] Fjern hardcoded fallback (validation-service.js)
- [ ] Fiks fordypningsberegning (fagområde vs læreplankode)
- [ ] Forenkle programområde-logikk (studiespesialisering = 1 område)
- [ ] Test alle 5 scenarios

### Dokumentasjon 🔜
- [ ] Skriv docs/GETTING_STARTED.md
- [ ] Skriv docs/VALIDATION_RULES.md
- [ ] Oppdater README.md

---

## 🎯 Suksess-kriterier

Appen er **ferdig** når:
1. ✅ Demo fungerer lokalt uten feil
2. ✅ Validering gir korrekte resultater for alle 5 test-scenarios
3. ✅ Ingen hardcoded regler (alt fra regler.yml)
4. ✅ Dokumentasjon ferdig (docs/)
5. ✅ Deploy til GitHub Pages fungerer
6. ✅ Live på www.bergenprivategymnas.no/planlegger

---

## 🤝 Hvordan fortsette denne sesjonen

**For neste Claude-sesjon:**

1. **Åpne i riktig mappe:**
   ```bash
   cd /Users/fredrik/Documents/studieplanlegger
   code . # eller åpne i editor
   ```

2. **Claude vil automatisk lese denne filen** og forstå konteksten

3. **Start med:**
   - "Test at demo fungerer lokalt"
   - eller "Start refaktorering av validering"
   - eller "Fiks problem X"

4. **Hvis Claude trenger mer kontekst:**
   - Pek til `til_claude.md` (viktige beslutninger)
   - Pek til `/Users/fredrik/Documents/school-data-project/REFAKTORERINGSPLAN.md`
   - Forklar hva som er gjort så langt (se denne filen)

---

**Lykke til! 🚀 Du har en solid foundation nå.**

**Key takeaway:** Studiespesialisering = ÉTT område. Dropp splitting. Fokuser på enkel fordypningsregel (560t fra 2+ fagområder).
