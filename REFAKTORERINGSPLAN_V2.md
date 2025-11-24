# Refaktoreringsplan v2 - Studieplanlegger
**Dato:** 2024-11-24
**Status:** Klar for godkjenning
**Grunnlag:** Beslutning om Studiespesialisering = ÉTT programområde

---

## 🎯 Overordnet mål

Få studieplanlegger-appen til å fungere 100% korrekt med **enkel, forenklet validering** basert på beslutningen om at studiespesialisering er ÉTT programområde (ikke split i realfag vs språk/samfunn).

**Suksesskriterier:**
1. ✅ App fungerer lokalt uten feil (npm run dev)
2. ✅ Validering gir korrekte resultater for alle test-scenarios
3. ✅ Ingen hardcoded regler (alt fra regler.yml)
4. ✅ Fordypning beregnes riktig (fagområde, ikke læreplankode)
5. ✅ Klar for deploy til GitHub Pages

---

## 💡 Viktig beslutning: Studiespesialisering = ÉTT programområde

Fra `til_claude.md`:
> Selv om programområdet formelt sett er delt inn i "Realfag" (STREA2----) og "Språk, samfunnsfag og økonomi" (STSSA2----), så ønsker jeg å **IGNORERE** dette og ta utgangspunkt i at programområdet "Studiespesialisering" er **ÉTT programområde**.

**Konsekvens:**
- ❌ DROPP hele programområde-splitting fra opprinnelig REFAKTORERINGSPLAN.md
- ✅ Enkel fordypningsregel: **560t fra 2+ fagområder** (uansett mix)
- ✅ Elever kan fritt kombinere realfag, språk og samfunnsfag for fordypning
- ✅ Kraftig forenklet validering!

**Fordypningsregel (forenklet):**
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
    antallOmrader,
    krav: { minTimer: 560, minOmrader: 2 }
  };
}
```

---

## 📋 Refaktoreringsplan: 3 Faser

### ✅ FASE 0: Testing og kartlegging (30 min)

**Mål:** Verifisere at monorepo setup fungerer og identifisere akutte bugs.

#### Oppgave 0.1: Test lokal demo
```bash
cd /Users/fredrik/Documents/studieplanlegger
npm run dev
# Åpne: http://localhost:8000/public/demo.html
```

**Sjekkliste:**
- [ ] API lastes uten feil (sjekk console)
- [ ] UI rendres uten feil
- [ ] Programområde kan velges
- [ ] Fremmedspråk-toggle fungerer
- [ ] VG1 matematikk/språk modal åpner
- [ ] VG2/VG3 blokkskjema modal åpner
- [ ] Fag kan velges
- [ ] Validering kjører (selv om den kan være feil)
- [ ] Fordypningsstatus vises

**Forventede problemer:**
- API URL kanskje feil → fiks i demo.html
- CSS mangler → sjekk at alle 4 CSS-filer er inkludert
- Import paths feil → fiks i JS-filer

**Output:** Dokumenter alle bugs i en liste → fiks i Fase 1

---

### 🔧 FASE 1: Fiks akutte bugs (1-2 timer)

**Mål:** Få appen til å fungere grunnleggende, selv om validering ikke er perfekt.

#### Oppgave 1.1: Fiks API-loading
**Problem:** API URL kan være feil eller data mangler felt.

**Sjekk:**
- `dist/api/v2/schools/bergen-private-gymnas/studieplanlegger.json` finnes
- JSON inneholder: `blokkskjema`, `regler`, `curriculum`, `timefordeling`, `schoolConfig`
- Alle fag har: `id`, `navn`, `timer`, `fagkode`, `lareplan`

**Fix hvis nødvendig:**
- Oppdater API URL i `demo.html` og `src/core/data-handler.js`
- Rebuild API: `npm run build`

---

#### Oppgave 1.2: Fiks import paths
**Problem:** Import paths kan være feil etter monorepo-kopiering.

**Sjekk alle import statements i:**
- `src/studieplanlegger.js` → skal importere fra `./core/` og `./ui/`
- `src/ui/ui-renderer.js` → skal importere fra `../core/`

**Fix hvis nødvendig:**
```javascript
// RIKTIG:
import { State } from './core/state.js';
import { ValidationService } from './core/validation-service.js';
import { DataHandler } from './core/data-handler.js';
import { UIRenderer } from './ui/ui-renderer.js';

// FEIL:
import { State } from './state.js';  // ❌ Mangler core/
```

---

#### Oppgave 1.3: Fiks CSS-inkludering
**Problem:** CSS-filer mangler eller er i feil rekkefølge.

**Riktig rekkefølge i `demo.html`:**
```html
<link rel="stylesheet" href="../styles/base.css">        <!-- 1. CSS-variabler -->
<link rel="stylesheet" href="../styles/brand.css">       <!-- 2. BPG-farger -->
<link rel="stylesheet" href="../styles/components/modal.css">  <!-- 3. Modal -->
<link rel="stylesheet" href="../styles/studieplanlegger.css">  <!-- 4. Widget -->
```

---

### 🚀 FASE 2: Refaktorer validering (2-3 timer)

**Mål:** Fjerne hardcoded regler og sikre at all validering kommer fra `regler.yml`.

#### Oppgave 2.1: Fjern hardcoded fallback i validation-service.js
**Problem:** P5 - `_loadFallbackRules()` (line 100-153) har hardcoded regler.

**Nåværende kode:**
```javascript
async init(apiBaseUrl) {
  try {
    // Load from API...
  } catch (error) {
    console.error('❌ Failed to load rules:', error);
    this._loadFallbackRules();  // ❌ Fallback til hardcoded regler
    return false;
  }
}
```

**Ny kode (fail-fast approach):**
```javascript
async init(apiBaseUrl) {
  try {
    const url = `${apiBaseUrl}/curriculum/regler.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load regler.json: ${response.status}`);
    }
    const regler = await response.json();

    this.eksklusjoner = regler.eksklusjoner || [];
    this.forutsetninger = regler.forutsetninger || [];
    this.fagomrader = regler.fagomrader || {};
    this.fordypningKrav = regler.fordypning || {};
    this._buildFagomradeMaps();

    this.loaded = true;
    console.log('✅ ValidationService loaded rules from API');
    return true;

  } catch (error) {
    this.loadError = error;
    console.error('❌ CRITICAL: Kunne ikke laste valideringsregler:', error);
    console.error('   Widgeten kan ikke brukes uten regler.');

    // Vis feilmelding til bruker (ikke last widget)
    throw error;  // ❌ FAIL FAST - ikke fallback!
  }
}
```

**Konsekvens:**
- Hvis API feiler → app viser feilmelding til bruker
- Ingen silent fallback til utdaterte hardcoded regler
- Tvinger oss til å fikse API-problemer umiddelbart

**Filer å endre:**
- `src/core/validation-service.js` (fjern `_loadFallbackRules()` metode helt)

**Testing:**
```javascript
// Test at init() feiler hvis API er nede
const validator = new ValidationService();
try {
  await validator.init('http://invalid-url');
} catch (error) {
  console.log('✅ PASS: Feiler som forventet');
}

// Test at init() fungerer med gyldig API
await validator.init('../dist/api/v2/schools/bergen-private-gymnas');
console.assert(validator.loaded === true, 'ValidationService should load');
console.assert(validator.eksklusjoner.length > 0, 'Should have exclusions');
console.assert(validator.fagomrader.MAT !== undefined, 'Should have MAT fagområde');
```

---

#### Oppgave 2.2: Fiks fordypningsberegning (fagområde vs læreplankode)
**Problem:** P7 - Fordypning beregnes basert på læreplankode, burde bruke fagområde.

**Nåværende kode (line 733-780):**
```javascript
// FEIL: Grupperer fag per læreplankode
allSelections.forEach(fag => {
  let lareplan = fag.lareplan;  // MAT03-02, MAT05-04 (ulike!)

  if (!fagomraderMap[lareplan]) {
    fagomraderMap[lareplan] = { timer: 0, fag: [] };
  }
  fagomraderMap[lareplan].timer += timer;
});
```

**Problem:**
- Matematikk R1/R2 (MAT03-02) og Matematikk 2P (MAT05-04) får **ulik gruppering**
- Men de tilhører **samme fagområde** "MAT"
- Dette gir feil fordypningsberegning!

**Ny kode (bruk fagområde fra fagomradeMap):**
```javascript
// RIKTIG: Grupperer fag per fagområde
allSelections.forEach(fag => {
  const fagId = (fag.id || fag.fagkode).toLowerCase();

  // Skip fag som ikke teller mot fordypning
  const excludedFromFordypning = ['matematikk-2p', 'spansk-i-ii'];
  if (excludedFromFordypning.includes(fagId)) return;

  // Hent fagområde fra fagomradeMap (bygget fra regler.yml)
  const fagomrade = this.fagomradeMap[fagId];

  if (!fagomrade) {
    console.warn(`⚠️ Fag ${fagId} mangler fagområde`);
    return;
  }

  if (!fagomraderMap[fagomrade]) {
    fagomraderMap[fagomrade] = {
      timer: 0,
      fag: [],
      navn: this.fagomradeNavn[fagomrade] || fagomrade
    };
  }

  const timer = parseInt(fag.timer) || 140;
  fagomraderMap[fagomrade].timer += timer;
  fagomraderMap[fagomrade].fag.push(fag.navn);
});

// Beregn fordypning (nå med riktig gruppering)
const areas = Object.entries(fagomraderMap).map(([code, data]) => ({
  code,
  name: data.navn,
  timer: data.timer,
  fagCount: Math.round(data.timer / 140),
  fag: data.fag
}));

// Sorter etter timer (høyest først)
areas.sort((a, b) => b.timer - a.timer);

// Finn de 2 største fagområdene (for fordypning)
const fordypningAreas = areas.slice(0, 2);
const totalTimer = fordypningAreas.reduce((sum, a) => sum + a.timer, 0);

return {
  areas,
  fordypningAreas,
  totalTimer,
  requiredTimer: 560,
  requiredAreas: 2,
  isValid: totalTimer >= 560 && areas.length >= 2
};
```

**Filer å endre:**
- `src/core/validation-service.js` - `validateCombinedSelections()` metode (line 733-800)
- `src/core/validation-service.js` - `getFordypningStatus()` metode (line 406-465)

**Testing:**
```javascript
// Test-case 1: Matematikk R1 + R2 + 2P
const selections = [
  { id: 'matematikk-r1', timer: 140 },  // MAT (teller)
  { id: 'matematikk-r2', timer: 140 },  // MAT (teller)
  { id: 'matematikk-2p', timer: 84 }    // MAT (teller IKKE)
];

const result = validator.getFordypningStatus({ vg2: { selections }, vg3: { selections: [] } });
console.assert(result.areas.find(a => a.code === 'MAT').timer === 280, 'MAT should have 280t (R1+R2)');
console.assert(result.areas.find(a => a.code === 'MAT').timer !== 364, 'MAT should NOT include 2P');

// Test-case 2: Fysikk 1 + Fysikk 2 (samme fagområde FYS)
const selections2 = [
  { id: 'fysikk-1', timer: 140 },  // FYS
  { id: 'fysikk-2', timer: 140 }   // FYS
];

const result2 = validator.getFordypningStatus({ vg2: { selections: selections2 }, vg3: { selections: [] } });
console.assert(result2.areas.find(a => a.code === 'FYS').timer === 280, 'FYS should have 280t');
```

---

#### Oppgave 2.3: Verifiser regler.yml dekker alle fag
**Problem:** Sjekk at alle fag i blokkskjema har fagområde i regler.yml.

**Steg:**
1. List alle unike fag-IDer fra blokkskjema_v2.yml
2. Sjekk at alle finnes i `fagomrader` i regler.yml
3. Hvis noe mangler → legg til i regler.yml

**Script for å verifisere:**
```javascript
// Kjør i browser console (etter app er lastet)
const allFagIds = new Set();

// Samle alle fag-IDer fra blokkskjema
window.studieplanlegger.dataHandler.data.blokkskjema.blokker.forEach(blokk => {
  blokk.fag.forEach(fag => allFagIds.add(fag.id));
});

// Sjekk om alle har fagområde
const validator = window.studieplanlegger.validator;
const missing = [];
allFagIds.forEach(fagId => {
  if (!validator.fagomradeMap[fagId]) {
    missing.push(fagId);
  }
});

if (missing.length > 0) {
  console.warn('⚠️ Følgende fag mangler fagområde i regler.yml:');
  missing.forEach(id => console.log('  -', id));
} else {
  console.log('✅ Alle fag har fagområde definert');
}
```

**Fix hvis nødvendig:**
Legg til manglende fag i `data/curriculum/regler.yml`:
```yaml
fagomrader:
  # ... existing ...

  # Legg til manglende fag her
  XYZ:
    navn: "Fagnavn"
    fag:
      - manglende-fag-id
```

---

### ✅ FASE 3: Testing og dokumentasjon (1-2 timer)

**Mål:** Verifisere at all validering fungerer korrekt for alle scenarios.

#### Oppgave 3.1: Test alle 5 validation scenarios

**Scenario 1: Gyldig realfag-fordypning**
```yaml
Programområde: studiespesialisering
Fremmedspråk: Ja (har fra ungdomsskolen)

VG2:
  - Matematikk: Matematikk R1 (140t, fagområde MAT)
  - Programfag:
    - Fysikk 1 (140t, fagområde FYS)
    - Kjemi 1 (140t, fagområde KJE)
    - Biologi 1 (140t, fagområde BIO)

VG3:
  - Historie (113t, fellesfag)
  - Programfag:
    - Matematikk R2 (140t, fagområde MAT)
    - Fysikk 2 (140t, fagområde FYS)
    - Kjemi 2 (140t, fagområde KJE)

Forventet resultat:
✅ Total: 833t fra 4 fagområder
✅ Fordypning: 700t (MAT=280t, FYS=280t, KJE=280t) - OK
✅ Ingen konflikter
```

**Scenario 2: Gyldig språk/samfunn-fordypning**
```yaml
Programområde: studiespesialisering
Fremmedspråk: Ja

VG2:
  - Matematikk: Matematikk S1 (140t, fagområde MAT)
  - Programfag:
    - Samfunnsøkonomi 1 (140t, fagområde SOK)
    - Historie og filosofi 1 (140t, fagområde HIF)
    - Psykologi 1 (140t, fagområde PSY)

VG3:
  - Historie (113t, fellesfag)
  - Programfag:
    - Matematikk S2 (140t, fagområde MAT)
    - Samfunnsøkonomi 2 (140t, fagområde SOK)
    - Historie og filosofi 2 (140t, fagområde HIF)

Forventet resultat:
✅ Total: 833t fra 4 fagområder
✅ Fordypning: 700t (MAT=280t, SOK=280t, HIF=280t) - OK
✅ Ingen konflikter
```

**Scenario 3: Matematikk-konflikt (R vs S)**
```yaml
Programområde: studiespesialisering
Fremmedspråk: Ja

VG2:
  - Matematikk: Matematikk R1 (140t)
  - Programfag:
    - Fysikk 1 (140t)

VG3:
  - Historie (113t)
  - Programfag:
    - Matematikk S2 (140t)  # ❌ FEIL: Kan ikke blande R og S!

Forventet resultat:
❌ Matematikk-konflikt: "Du kan ikke kombinere Matematikk R1 (VG2) med Matematikk S2 (VG3) - de tilhører ulike matematikk-linjer"
❌ Forslag: "Velg matematikk fra samme linje (enten R-linjen eller S-linjen) på både VG2 og VG3"
```

**Scenario 4: For lite fordypning**
```yaml
Programområde: studiespesialisering
Fremmedspråk: Ja

VG2:
  - Matematikk: Matematikk R1 (140t)
  - Programfag:
    - Fysikk 1 (140t)

VG3:
  - Historie (113t)
  - Programfag:
    - Matematikk R2 (140t)

Forventet resultat:
⚠️ Fordypning: 420t / 560t (mangler 140t)
⚠️ Kun 2 fagområder: MAT (280t), FYS (140t)
⚠️ Forslag: "Velg flere fag fra samme fagområde for å oppnå fordypning"
```

**Scenario 5: Kun 1 fagområde**
```yaml
Programområde: studiespesialisering
Fremmedspråk: Ja

VG2:
  - Matematikk: Matematikk R1 (140t)
  - Programfag:
    - Matematikk X (140t)  # Ekstra matematikk

VG3:
  - Historie (113t)
  - Programfag:
    - Matematikk R2 (140t)
    - Matematikk 2P (84t)  # Teller IKKE mot fordypning

Forventet resultat:
⚠️ Fordypning: 420t / 560t
❌ Kun 1 fagområde (MAT) - trenger 2
⚠️ Forslag: "Velg fag fra minst ett annet fagområde"
```

**Testing-metode:**
For hvert scenario:
1. Gjenopprett appen (refresh demo.html)
2. Velg fag som beskrevet i scenario
3. Sjekk at validering viser riktig resultat
4. Dokumenter resultat: ✅ PASS eller ❌ FAIL

---

#### Oppgave 3.2: Lag dokumentasjon
**Mål:** Dokumentere hvordan appen fungerer og hvordan validering virker.

**Filer å lage:**
1. `docs/GETTING_STARTED.md` - Hvordan komme i gang (npm install, npm run dev, etc.)
2. `docs/VALIDATION_RULES.md` - Forklare hvordan valideringsregler fungerer
3. `docs/DATA_FLOW.md` - Dataflyt fra UDIR til app

**Eksempel: `docs/VALIDATION_RULES.md`**
```markdown
# Validation Rules - Studieplanlegger

## Hvordan validering fungerer

All validering kommer fra `data/curriculum/regler.yml`. Ingen hardcoded regler!

### Eksklusjoner (mutual exclusions)

Fag som ikke kan kombineres:
- **Matematikk S vs R:** S-linja (S1/S2) og R-linja (R1/R2) kan ikke kombineres
- **Matematikk R/S vs 2P:** R1 eller S1 erstatter 2P
- **Geofag X vs 1:** Kan ikke kombineres
- **Teknologi X vs 1:** Kan ikke kombineres

### Forutsetninger (prerequisites)

Fag som anbefales å ta i rekkefølge:
- Fysikk 2 anbefales med Fysikk 1 først
- Kjemi 2 anbefales med Kjemi 1 først
- Matematikk R2 krever R1
- Matematikk S2 krever S1
- (+ 10 andre forutsetninger)

### Fordypningskrav (for studiespesialisering)

- Minimum 560 timer fra **2+ fagområder**
- Hvert fagområde må ha minst 280 timer
- **Viktig:** Elever kan fritt kombinere realfag, språk og samfunnsfag (studiespesialisering = ÉTT programområde)

Eksempel gyldig fordypning:
- Matematikk R1 + R2 = 280t (fagområde MAT)
- Fysikk 1 + 2 = 280t (fagområde FYS)
- **Totalt:** 560t fra 2 fagområder ✅

### Fagområder

14 fagområder definert i regler.yml:
- MAT: Matematikk
- FYS: Fysikk
- KJE: Kjemi
- BIO: Biologi
- GEO: Geofag
- IT: Informasjonsteknologi
- TOF: Teknologi og forskningslære
- SOK: Samfunnsøkonomi
- PSY: Psykologi
- HIF: Historie og filosofi
- ENG: Engelsk
- FSP: Fremmedspråk
- MUS: Musikk
- (+ flere)
```

---

#### Oppgave 3.3: Opprydding i kodebase
**Mål:** Fjerne gammelt rusk og utdaterte filer.

**Filer å slette/arkivere:**
- [ ] Gamle refaktoreringsplaner (hvis noen)
- [ ] `src/core/validation.js` (legacy file med hardcoded rules, hvis den finnes)
- [ ] Gamle TODO-filer (utdaterte)
- [ ] Test-filer som ikke er relevante

**Filer å beholde:**
- ✅ `CLAUDE.md` (kontekst-dokument)
- ✅ `til_claude.md` (viktige beslutninger)
- ✅ `REFAKTORERINGSPLAN_V2.md` (denne filen)
- ✅ `README.md`
- ✅ `package.json`
- ✅ All kildekode i `src/`
- ✅ All data i `data/`

---

## 📊 Estimert tidsbruk

- **Fase 0:** Testing og kartlegging (30 min)
- **Fase 1:** Fiks akutte bugs (1-2 timer)
- **Fase 2:** Refaktorer validering (2-3 timer)
- **Fase 3:** Testing og dokumentasjon (1-2 timer)

**Totalt:** 5-8 timer

---

## 🎯 Suksesskriterier (repetert)

Appen er **ferdig** når:
1. ✅ Demo fungerer lokalt uten feil
2. ✅ Alle 5 test-scenarios gir korrekte resultater
3. ✅ Ingen hardcoded regler (alt fra regler.yml)
4. ✅ Fordypning beregnes riktig (fagområde, ikke læreplankode)
5. ✅ Dokumentasjon ferdig (docs/)
6. ✅ Klar for deploy til GitHub Pages

---

## 🚦 Godkjenning

**Før vi starter:**
- [ ] Du har lest og forstått denne planen
- [ ] Du godkjenner tilnærmingen (forenklet, ÉTT programområde)
- [ ] Du er enig i at vi dropper programområde-splitting helt

**Etter godkjenning:**
Jeg starter med Fase 0 (testing) og fortsetter fase for fase.

---

**Neste steg:** Si ifra når du er klar, så starter jeg Fase 0! 🚀
