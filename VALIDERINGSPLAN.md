# VALIDERINGSPLAN - Studieplanlegger
**Dato:** 2024-11-24
**Skole:** Bergen Private Gymnas
**Premiss:** Studiespesialisering = ÉTT programområde (STREA + STSSA slått sammen)

---

## 📋 Innhold

1. [Datamodell og kilder](#1-datamodell-og-kilder)
2. [Valideringsarkitektur](#2-valideringsarkitektur)
3. [Valideringsregler (komplett)](#3-valideringsregler-komplett)
4. [UI/UX-logikk](#4-uiux-logikk)
5. [Testcases](#5-testcases)
6. [Kommentarer og oppfølging](#6-kommentarer-og-oppfølging)

---

## 1. Datamodell og kilder

### 1.1 UDIR-kilder (nasjonale regler)
**Fil:** `data/curriculum/regler.yml`

**Innhold:**
- **Eksklusjoner:** Fag som IKKE kan kombineres (f.eks. Mat S vs R)
- **Forutsetninger:** Fag som bygger på andre fag (f.eks. Fysikk 2 krever Fysikk 1)
- **Fagområder:** Gruppering av fag for fordypningsberegning (MAT, FYS, KJE, BIO, etc.)
- **Fordypningskrav:** 560t fra 2+ fagområder (280t per område)
- **Obligatoriske fag:** Historie VG3 (alle), Matematikk VG2 (studiespesialisering)

**Kilde:** UDIR regelverkstolkninger + vitnemålsregler

### 1.2 BPG-spesifikke kilder

#### A) Timefordeling
**Fil:** `data/schools/bergen-private-gymnas/timefordeling.yml`

**Innhold:**
- **Fellesfag per trinn:** Norsk, Engelsk, Naturfag, etc.
- **VG1-valg:** Matematikk (1P/1T) + Fremmedspråk
- **Felles programfag:** Obligatoriske programfag per program (f.eks. Musikk MDD)

**Kilde:** UDIR fag- og timefordeling (Udir-1-2025)

#### B) Blokkskjema
**Fil:** `data/schools/bergen-private-gymnas/blokkskjema_v2.yml`

**Innhold:**
- **4 blokker** med parallelle fag
- **Valgfrie programfag** per blokk per trinn
- **Valgregler per program:** minAntallFag, maxAntallFag, krav, infomeldinger
- **Timevalidering:** Totale timekrav per program og trinn

**Kilde:** BPG faktisk blokkskjema 2025-11-20

---

## 2. Valideringsarkitektur

### 2.1 Tre valideringsnivåer

```
┌─────────────────────────────────────────────────────────────┐
│                     VALIDERINGSLAG                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. BLOKK-INTERN VALIDERING (real-time i modal)            │
│     ↳ Kjører: Ved klikk på fag i blokkskjema-modal         │
│     ↳ Sjekker: Eksklusjoner, blokkregler                   │
│     ↳ Effekt: Blokkerer fag, viser rødt                    │
│                                                             │
│  2. MODAL-VALIDERING (ved "Legg til fag")                  │
│     ↳ Kjører: Når bruker klikker "Legg til fag"            │
│     ↳ Sjekker: minAntallFag, matematikk, historie, spansk  │
│     ↳ Effekt: Blokkerer lagring, viser feilmelding         │
│                                                             │
│  3. GLOBAL VALIDERING (etter lagring)                      │
│     ↳ Kjører: Etter fagvalg er lagret til state            │
│     ↳ Sjekker: Fordypning, forutsetninger, total timer     │
│     ↳ Effekt: Viser advarsler i hovedvisning               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Dataflyt

```
BRUKER VELGER FAG
     ↓
[1. BLOKK-INTERN VALIDERING]
     ↓ (hvis OK)
Fag markeres som "selected" i modal
     ↓
BRUKER KLIKKER "Legg til fag"
     ↓
[2. MODAL-VALIDERING]
     ↓ (hvis OK)
State oppdateres (setProgramfag)
     ↓
[3. GLOBAL VALIDERING]
     ↓
UI oppdateres med advarsler/suksess
```

### 2.3 State-struktur

```javascript
state = {
  programomrade: 'studiespesialisering',  // eller 'musikk-dans-drama', 'medier-kommunikasjon'
  harFremmedsprak: true,  // fra VG1-valg

  vg1: {
    selections: [
      { id: 'matematikk-1p', navn: 'Matematikk 1P', timer: 140, fagkode: 'MAT1019', type: 'fellesfag', slot: 'matematikk' },
      { id: 'spansk-ii', navn: 'Spansk II', timer: 113, fagkode: 'FSP6218', type: 'fellesfag', slot: 'fremmedsprak' }
    ]
  },

  vg2: {
    selections: [
      { id: 'matematikk-r1', navn: 'Matematikk R1', timer: 140, fagkode: 'MAT1015', type: 'programfag', slot: 'matematikk' },
      { id: 'fysikk-1', navn: 'Fysikk 1', timer: 140, fagkode: 'FYS1002', type: 'programfag', slot: 'programfag-1', blokkId: 'blokk3' },
      { id: 'kjemi-1', navn: 'Kjemi 1', timer: 140, fagkode: 'KJE1002', type: 'programfag', slot: 'programfag-2', blokkId: 'blokk2' },
      { id: 'biologi-1', navn: 'Biologi 1', timer: 140, fagkode: 'BIO1002', type: 'programfag', slot: 'programfag-3', blokkId: 'blokk1' }
    ]
  },

  vg3: {
    selections: [
      { id: 'historie-vg3', navn: 'Historie', timer: 113, fagkode: 'HIS1010', type: 'fellesfag', slot: 'historie' },
      { id: 'matematikk-r2', navn: 'Matematikk R2', timer: 140, fagkode: 'MAT1016', type: 'programfag', slot: 'programfag-1', blokkId: 'blokk1' },
      { id: 'fysikk-2', navn: 'Fysikk 2', timer: 140, fagkode: 'FYS1003', type: 'programfag', slot: 'programfag-2', blokkId: 'blokk3' },
      { id: 'kjemi-2', navn: 'Kjemi 2', timer: 140, fagkode: 'KJE1003', type: 'programfag', slot: 'programfag-3', blokkId: 'blokk4' }
    ]
  }
}
```

**Viktige felter:**
- `id`: Curriculum ID (f.eks. "historie-vg3")
- `fagkode`: UDIR fagkode (f.eks. "HIS1010") - brukes i validering
- `type`: "fellesfag" eller "programfag"
- `slot`: Identifiserer fagets rolle (f.eks. "matematikk", "historie", "programfag-1")
- `blokkId`: Hvilken blokk faget ble valgt fra (hvis relevant)

---

## 3. Valideringsregler (komplett)

### 3.1 Eksklusjoner (BLOKKERENDE)

**Kilde:** `regler.yml` → eksklusjoner

| ID | Type | Regel | Feilmelding | UI-effekt |
|----|------|-------|-------------|-----------|
| **math-s-r-conflict** | blocking | Matematikk S-linja (S1/S2) kan ikke kombineres med R-linja (R1/R2) | "Du kan ikke kombinere Matematikk S og R på samme vitnemål" | ❌ Blokkerer valg i modal + Rød melding |
| **math-programfag-2p-conflict** | blocking | Matematikk R1/S1 erstatter fellesfaget 2P | "Du kan ikke kombinere R1/S1 med 2P - programfaget erstatter fellesfaget" | ❌ Blokkerer valg i modal |
| **geofag-x-1-conflict** | blocking | Geofag X og Geofag 1 kan ikke føres på samme vitnemål | "Geofag X og Geofag 1 kan ikke kombineres" | ❌ Blokkerer valg i modal |
| **tof-x-1-conflict** | blocking | Teknologi X og Teknologi 1 kan ikke føres på samme vitnemål | "Teknologi og forskningslære X og 1 kan ikke kombineres" | ❌ Blokkerer valg i modal |

**Implementasjon:**
- Sjekkes i **Lag 1: Blokk-intern validering**
- Fag som bryter regler får CSS-klasse `.blocked`
- Klikk på blokkert fag → shake-animasjon + feilmelding

### 3.2 Forutsetninger (ADVARSLER)

**Kilde:** `regler.yml` → forutsetninger

| Fag | Krever | Type | Feilmelding | UI-effekt |
|-----|--------|------|-------------|-----------|
| fysikk-2 | fysikk-1 | warning | "Fysikk 2 anbefales med Fysikk 1 først" | ⚠️ Gul advarsel |
| kjemi-2 | kjemi-1 | warning | "Kjemi 2 anbefales med Kjemi 1 først" | ⚠️ Gul advarsel |
| biologi-2 | biologi-1 | warning | "Biologi 2 anbefales med Biologi 1 først" | ⚠️ Gul advarsel |
| matematikk-r2 | matematikk-r1 | warning | "Matematikk R2 krever at du har hatt R1 i VG2" | ⚠️ Gul advarsel |
| matematikk-s2 | matematikk-s1 | warning | "Matematikk S2 krever at du har hatt S1 i VG2" | ⚠️ Gul advarsel |
| *-2 (alle nivå 2-fag) | *-1 | warning | "[Fag] nivå 2 anbefales med nivå 1 først" | ⚠️ Gul advarsel |

**Implementasjon:**
- Sjekkes i **Lag 3: Global validering**
- Vises som advarsler i hovedvisning (ikke blokkerer valg)
- Brukeren kan ignorere (men får tydelig beskjed)

### 3.3 Fordypningskrav (KRITISK)

**Kilde:** `regler.yml` → fordypning

#### Studiespesialisering
```yaml
minTimer: 560
minOmrader: 2
timerPerOmrade: 280
beskrivelse: "Minimum 560 timer fordypning fra 2 fagområder (280 timer hver)"
```

**Fordypningsberegning:**
1. Gruppper alle programfag per fagområde (fra `regler.yml` → fagomrader)
2. Summer timer per fagområde
3. Tell antall fagområder med minst 280 timer
4. Krav: Totalt 560t + minst 2 fagområder

**Unntak:**
- Matematikk 2P teller IKKE mot fordypning
- Spansk I+II teller IKKE mot fordypning
- Historie teller IKKE mot fordypning (fellesfag)

**Fag som telles:**
- Kun `type: 'programfag'` ELLER
- `type: 'fellesfag'` med `slot: 'matematikk'` (hvis R1/S1)

**Fagområder (fra regler.yml):**
- **MAT:** matematikk-r1, matematikk-r2, matematikk-s1, matematikk-s2, matematikk-2p, matematikk-x
- **FYS:** fysikk-1, fysikk-2
- **KJE:** kjemi-1, kjemi-2
- **BIO:** biologi-1, biologi-2
- **GEO:** geofag-1, geofag-2, geofag-x
- **IT:** informasjonsteknologi-1, informasjonsteknologi-2
- **TOF:** teknologi-og-forskningslare-1/2/x
- **SOK:** samfunnsokonomi-1, samfunnsokonomi-2
- **OKO:** okonomistyring, okonomi-og-ledelse
- **MOL:** markedsforing-og-ledelse-1, markedsforing-og-ledelse-2
- **ENT:** entreprenorskap-og-bedriftsutvikling-1, entreprenorskap-og-bedriftsutvikling-2
- **POS:** politikk-og-menneskerettigheter, sosialkunnskap, sosiologi-og-sosialantropologi
- **PSY:** psykologi-1, psykologi-2
- **RET:** rettslare-1, rettslare-2
- **HIF:** historie-og-filosofi-1, historie-og-filosofi-2
- **ENG:** engelsk-1, engelsk-2, internasjonal-engelsk
- **FSP:** spansk-1/2/3, tysk-1/2/3, fransk-1/2/3 (unntak: 2 ulike fremmedspråk = 1 fagområde)
- **MUS:** musikk-fordypning-1, musikk-fordypning-2
- **KUN:** bilde, grafisk-design

**Feilmeldinger:**
- `fordypning-insufficient-hours`: "Du har [X]t, men trenger minst 560t fra programfag"
- `fordypning-insufficient-areas`: "Du har fag fra [X] fagområde(r), men trenger minimum 2 fagområder"

**UI-effekt:**
- ❌ Rød feilmelding i hovedvisning
- Viser fordypningsstatus: "Fordypning: 420t fra 3 fagområder (MAT 280t, FYS 280t, KJE 140t)"

#### Musikk-dans-drama
```yaml
minTimer: 0
minOmrader: 0
beskrivelse: "Musikk har ikke fordypningskrav på samme måte"
```

#### Medier-kommunikasjon
```yaml
minTimer: 0
minOmrader: 0
beskrivelse: "Medier og kommunikasjon har ikke fordypningskrav"
```

### 3.4 Obligatoriske fag

**Kilde:** `regler.yml` → obligatoriskeFag

| Fag | Trinn | Program | Timer | Beskrivelse |
|-----|-------|---------|-------|-------------|
| **historie** | VG3 | Alle | 113 | "Historie er obligatorisk fellesfag i VG3" |
| **matematikk** | VG2 | Studiespesialisering | - | "Må velge ett matematikkfag (2P, R1 eller S1)" |
| **spansk-i-ii** | VG3 | Alle (betinget) | 140 | "Elever uten fremmedspråk fra ungdomsskolen må ta Spansk I+II" |

**Implementasjon:**
- Historie: Sjekkes i **Lag 2: Modal-validering** (VG3)
- Matematikk: Sjekkes i **Lag 2: Modal-validering** (VG2)
- Spansk: Sjekkes i **Lag 2: Modal-validering** (VG3) hvis `harFremmedsprak === false`

### 3.5 Blokkregler (BPG-spesifikke)

**Kilde:** `blokkskjema_v2.yml` → valgregler

#### Studiespesialisering VG2
```yaml
minAntallFag: 4  # 3 programfag + matematikk
maxAntallFag: 4
krav:
  - type: "minimum-timer"
    timer: 420
  - type: "matematikk-obligatorisk"
```

**Feilmeldinger:**
- "Du må velge matematikk for VG2!"
- "Du må velge 4 fag totalt (3 programfag + matematikk)"

#### Studiespesialisering VG3
```yaml
minAntallFag: 4  # 3 programfag + historie
maxAntallFag: 4
krav:
  - type: "minimum-timer"
    timer: 420
  - type: "obligatorisk-fag"
    fagId: "historie-vg3"
  - type: "fordypning-krav"
    minTimer: 280
    fagtype: "fordypning-niva-2"
  - type: "spansk-betinget"
```

**Feilmeldinger:**
- "Du må velge Historie VG3"
- "Du må velge to programfag nivå 2 (fordypning)"
- "Du må velge Spansk I+II siden du ikke hadde fremmedspråk på ungdomsskolen!"

#### Musikk-dans-drama VG2
```yaml
minAntallFag: 1  # 1 valgfritt programfag (+ matematikk separat)
maxAntallFag: 1
krav:
  - type: "minimum-timer-uten-matte"
    timer: 140
  - type: "matematikk-obligatorisk"
```

#### Musikk-dans-drama VG3
```yaml
minAntallFag: 2  # 1 valgfritt programfag + historie
maxAntallFag: 2
krav:
  - type: "minimum-timer"
    timer: 253
  - type: "obligatorisk-fag"
    fagId: "historie-vg3"
  - type: "spansk-betinget"
```

#### Medier-kommunikasjon (samme som Musikk)

### 3.6 Spesialregler

**Kilde:** `regler.yml` → spesialregler

#### Matematikk erstatter 2P
```yaml
gjelder: [matematikk-r1, matematikk-s1]
erstatter: matematikk-2p
frigjorteTimer: 84
```

**Effekt:**
- Hvis R1/S1 velges i VG2, fjernes 2P fra fellesfag
- 84 timer flyttes fra fellesfag til programfag

#### Samisk/kvensk/finsk
```yaml
type: fritak
beskrivelse: "Elever med samisk/kvensk/finsk er fritatt fra fremmedspråkkrav"
```

**Effekt:**
- Ikke implementert ennå (vurder senere)

---

## 4. UI/UX-logikk

### 4.1 Blokkskjema-modal

**Oppførsel:**
1. **Åpning:**
   - Henter fag per blokk fra `blokkskjema.blokker[blokkId].fag`
   - Filtrerer på `trinn` og `tilgjengeligFor`
   - Gjenoppretter eksisterende valg fra state (`data-id` matching)

2. **Fag-klikk:**
   - Sjekker blokkering (eksklusjoner)
   - Hvis blokkert → shake-animasjon + feilmelding
   - Hvis OK → toggle "selected" class
   - Oppdaterer `selectedBlokkskjemaFag` array

3. **Valideringsvisning:**
   - Real-time oppdatering av valideringstekst
   - Viser antall valgte fag vs krav
   - Viser timer-totalt
   - Farger: Grønn (OK), Rød (feil)

4. **"Legg til fag"-knapp:**
   - Sjekker modal-validering (minAntallFag, matematikk, historie, spansk)
   - Hvis feil → blokkerer + viser feilmelding i modal
   - Hvis OK → kaller `state.setProgramfag()` → lukker modal

### 4.2 Hovedvisning

**Oppførsel:**
1. **VG1-kolonnen:**
   - Viser fellesfag (statiske)
   - Viser VG1-valg (matematikk + fremmedspråk) - klikk for å endre

2. **VG2-kolonnen:**
   - Viser fellesfag (statiske)
   - Viser valgte programfag (fra blokkskjema)
   - Klikk på programfag-gruppe → åpner blokkskjema-modal

3. **VG3-kolonnen:**
   - Viser fellesfag (statiske)
   - Viser valgte programfag (fra blokkskjema)
   - Klikk på programfag-gruppe → åpner blokkskjema-modal

4. **Fordypningsboks:**
   - Vises nederst i modal (eller i hovedvisning)
   - Viser fordypningsstatus: "[X]t fra [Y] fagområder"
   - Liste over fagområder med timer
   - Farger: Grønn (≥560t + ≥2 områder), Rød (ikke oppfylt)

5. **Valideringspanel:**
   - Vises i hovedvisning (under kolonner)
   - Lister alle feil og advarsler
   - Farge: Rød (feil), Gul (advarsel)
   - Klikk for å utvide/kollapse

### 4.3 Data-attributter (viktig!)

**Alle fag i blokkskjema-modal må ha:**
```html
<div class="sp-blokk-fag-item"
     data-id="fysikk-1"           <!-- Curriculum ID -->
     data-fagkode="FYS1002"        <!-- UDIR fagkode (brukes i validering) -->
     data-timer="140"
     data-lareplan="FYS01-01">    <!-- Læreplankode -->
```

**Viktig:**
- `data-id` = curriculum ID (brukes for matching med state)
- `data-fagkode` = UDIR fagkode (brukes for validering mot regler.yml)
- Dette sikrer at "historie-vg3" får fagkode "HIS1010" og identifiseres som fellesfag

### 4.4 CSS-klasser for validering

| Klasse | Betydning | Visuell effekt |
|--------|-----------|----------------|
| `.blocked` | Faget er blokkert (eksklusjon) | Grå + rød border + cursor: not-allowed |
| `.selected` | Faget er valgt | Grønn border + bakgrunn |
| `.obligatorisk` | Faget er obligatorisk | Gul badge "OBL" |
| `.fordypning-1` | Fag nivå 1 | Blå badge "Nivå 1" |
| `.fordypning-2` | Fag nivå 2 | Lilla badge "Nivå 2" |
| `.shake` | Animasjon ved ugyldig klikk | Riste-animasjon |

---

## 5. Testcases

### 5.1 Studiespesialisering - Realfag (GYLDIG)

**VG1:**
- Matematikk: 1T
- Fremmedspråk: Spansk II (harFremmedsprak = true)

**VG2:**
- Matematikk: R1 (140t) → MAT
- Fysikk 1 (140t) → FYS
- Kjemi 1 (140t) → KJE
- Biologi 1 (140t) → BIO

**VG3:**
- Historie VG3 (113t) - obligatorisk
- Matematikk R2 (140t) → MAT
- Fysikk 2 (140t) → FYS
- Kjemi 2 (140t) → KJE

**Forventet resultat:**
- ✅ **Fordypning OK:** 700t fra 4 fagområder
  - MAT: 280t (R1 + R2)
  - FYS: 280t (Fysikk 1 + 2)
  - KJE: 280t (Kjemi 1 + 2)
  - BIO: 140t (Biologi 1)
- ✅ **Matematikk:** R-linje OK (R1 → R2)
- ✅ **Historie:** Obligatorisk OK
- ✅ **Forutsetninger:** Alle nivå 2-fag har nivå 1 først

---

### 5.2 Studiespesialisering - Språk/samfunn (GYLDIG)

**VG1:**
- Matematikk: 1P
- Fremmedspråk: Spansk II (harFremmedsprak = true)

**VG2:**
- Matematikk: S1 (140t) → MAT
- Samfunnsøkonomi 1 (140t) → SOK
- Historie og filosofi 1 (140t) → HIF
- Psykologi 1 (140t) → PSY

**VG3:**
- Historie VG3 (113t) - obligatorisk
- Matematikk S2 (140t) → MAT
- Samfunnsøkonomi 2 (140t) → SOK
- Historie og filosofi 2 (140t) → HIF

**Forventet resultat:**
- ✅ **Fordypning OK:** 700t fra 4 fagområder
  - MAT: 280t (S1 + S2)
  - SOK: 280t (Samfunnsøkonomi 1 + 2)
  - HIF: 280t (Historie og filosofi 1 + 2)
  - PSY: 140t (Psykologi 1)
- ✅ **Matematikk:** S-linje OK (S1 → S2)
- ✅ **Historie:** Obligatorisk OK
- ✅ **Forutsetninger:** Alle nivå 2-fag har nivå 1 først

---

### 5.3 Studiespesialisering - Blandet (GYLDIG)

**VG1:**
- Matematikk: 1T
- Fremmedspråk: Spansk II (harFremmedsprak = true)

**VG2:**
- Matematikk: R1 (140t) → MAT
- Fysikk 1 (140t) → FYS
- Samfunnsøkonomi 1 (140t) → SOK
- Psykologi 1 (140t) → PSY

**VG3:**
- Historie VG3 (113t) - obligatorisk
- Matematikk R2 (140t) → MAT
- Fysikk 2 (140t) → FYS
- Samfunnsøkonomi 2 (140t) → SOK

**Forventet resultat:**
- ✅ **Fordypning OK:** 700t fra 4 fagområder
  - MAT: 280t (R1 + R2)
  - FYS: 280t (Fysikk 1 + 2)
  - SOK: 280t (Samfunnsøkonomi 1 + 2)
  - PSY: 140t (Psykologi 1)
- ✅ **Matematikk:** R-linje OK
- ✅ **Historie:** Obligatorisk OK
- ✅ Premiss bekreftet: Realfag + språk/samfunn kan kombineres fritt!

---

### 5.4 Matematikk-konflikt (UGYLDIG)

**VG1:**
- Matematikk: 1T
- Fremmedspråk: Spansk II (harFremmedsprak = true)

**VG2:**
- Matematikk: **R1** (140t) → MAT

**VG3:**
- Historie VG3 (113t) - obligatorisk
- Matematikk: **S2** (140t) ← FEIL!

**Forventet resultat:**
- ❌ **Eksklusjon:** "Du kan ikke kombinere Matematikk S og R på samme vitnemål"
- Effekt: S2 blokkeres i blokkskjema-modal (grå + rød border)

---

### 5.5 For lite fordypning (UGYLDIG)

**VG1:**
- Matematikk: 1T
- Fremmedspråk: Spansk II (harFremmedsprak = true)

**VG2:**
- Matematikk: R1 (140t) → MAT
- Fysikk 1 (140t) → FYS
- Samfunnsøkonomi 1 (140t) → SOK
- Psykologi 1 (140t) → PSY

**VG3:**
- Historie VG3 (113t) - obligatorisk
- Matematikk R2 (140t) → MAT
- Økonomi og ledelse (140t) → OKO
- Bilde (140t) → KUN

**Forventet resultat:**
- ❌ **Fordypning ikke oppfylt:** Totalt 560t, men kun 1 fagområde med 280t
  - MAT: 280t (R1 + R2) ✅
  - FYS: 140t ❌ (trenger 280t)
  - SOK: 140t ❌
  - PSY: 140t ❌
  - OKO: 140t ❌
  - KUN: 140t ❌
- Feilmelding: "Du har fag fra 6 fagområder, men kun 1 fagområde har 280+ timer"

---

### 5.6 Kun 1 fagområde (UGYLDIG)

**VG1:**
- Matematikk: 1T
- Fremmedspråk: Spansk II (harFremmedsprak = true)

**VG2:**
- Matematikk: R1 (140t) → MAT
- Matematikk X (140t) → MAT (hvis tilgjengelig)
- Informasjonsteknologi 1 (140t) → IT
- Informasjonsteknologi 2 (140t) → IT

**VG3:**
- Historie VG3 (113t) - obligatorisk
- Matematikk R2 (140t) → MAT
- Biologi 1 (140t) → BIO
- Fysikk 1 (140t) → FYS

**Forventet resultat:**
- ❌ **Fordypning ikke oppfylt:** Totalt 560t, men kun 1 fagområde med 280t
  - MAT: 420t (R1 + X + R2) ✅ (over 280t)
  - IT: 280t ✅ (over 280t)
  - BIO: 140t ❌
  - FYS: 140t ❌
- Feilmelding: "Du har fag fra 4 fagområder, men trenger minimum 2 fagområder med 280+ timer hver"

**MERK:** Dette kan være korrekt tolkning, men spør bruker!

---

### 5.7 Mangler forutsetning (ADVARSEL)

**VG1:**
- Matematikk: 1T
- Fremmedspråk: Spansk II (harFremmedsprak = true)

**VG2:**
- Matematikk: R1 (140t) → MAT
- Samfunnsøkonomi 1 (140t) → SOK
- Psykologi 1 (140t) → PSY
- Bilde (140t) → KUN

**VG3:**
- Historie VG3 (113t) - obligatorisk
- Matematikk R2 (140t) → MAT
- **Fysikk 2** (140t) → FYS ← ADVARSEL (mangler Fysikk 1!)
- **Kjemi 2** (140t) → KJE ← ADVARSEL (mangler Kjemi 1!)

**Forventet resultat:**
- ⚠️ **Forutsetning advarsel:** "Fysikk 2 anbefales med Fysikk 1 først"
- ⚠️ **Forutsetning advarsel:** "Kjemi 2 anbefales med Kjemi 1 først"
- ❌ **Fordypning ikke oppfylt:** Totalt 560t, men kun 1 fagområde med 280t
- Effekt: Gul advarsel vises, men valget blokkeres ikke

---

### 5.8 Spansk I+II obligatorisk (BETINGET)

**VG1:**
- Matematikk: 1T
- Fremmedspråk: Spansk I+II (harFremmedsprak = **false**)

**VG2:**
- Matematikk: R1 (140t) → MAT
- Fysikk 1 (140t) → FYS
- Kjemi 1 (140t) → KJE
- Biologi 1 (140t) → BIO

**VG3:**
- Historie VG3 (113t) - obligatorisk
- **Spansk I+II VG3** (140t) - obligatorisk (betinget)
- Matematikk R2 (140t) → MAT
- Fysikk 2 (140t) → FYS

**Forventet resultat:**
- ✅ **Spansk OK:** Spansk I+II obligatorisk når harFremmedsprak = false
- ✅ **Fordypning OK:** 560t fra 3 fagområder (MAT 280t, FYS 280t, KJE 140t, BIO 140t)
  - **Spansk I+II teller IKKE mot fordypning!**
- ⚠️ **Fordypning IKKE OK:** Kun 560t fra 3 fagområder (trenger 280t per område!)
  - MAT: 280t ✅
  - FYS: 280t ✅
  - KJE: 140t ❌
  - BIO: 140t ❌
- Feilmelding: "Du har fag fra 4 fagområder, men kun 2 fagområder har 280+ timer"

**RIKTIG versjon:**

**VG3:**
- Historie VG3 (113t) - obligatorisk
- **Spansk I+II VG3** (140t) - obligatorisk (betinget)
- Matematikk R2 (140t) → MAT
- Fysikk 2 (140t) → FYS
- **Kjemi 2** (140t) → KJE ← MÅ LEGGES TIL!

Men da får vi 5 fag i VG3! Dette er **problematisk** - sjekk med bruker!

---

### 5.9 Musikk-dans-drama VG2 (GYLDIG)

**VG1:**
- Matematikk: 1P
- Fremmedspråk: Spansk II (harFremmedsprak = true)

**VG2:**
- Matematikk: 2P (84t) - fellesfag
- Bilde (140t) - valgfritt programfag

**Forventet resultat:**
- ✅ **Matematikk OK:** 2P valgt
- ✅ **Valgfritt programfag OK:** 1 fag (140t)
- ✅ **Totalt:** 504t fellesfag + 140t valgfritt programfag = 644t

---

### 5.10 Musikk-dans-drama VG3 (GYLDIG)

**VG3:**
- Historie VG3 (113t) - obligatorisk
- Biologi 1 (140t) - valgfritt programfag

**Forventet resultat:**
- ✅ **Historie OK:** Obligatorisk oppfylt
- ✅ **Valgfritt programfag OK:** 1 fag (140t)
- ✅ **Totalt:** 365t fellesfag + 476t felles programfag + 140t valgfritt = 981t

---

## 6. Kommentarer og oppfølging

### 6.1 Spørsmål til bruker

**❓ SPØRSMÅL 1: Fordypningskrav - 2 fagområder med 280t HVER?**

Fra UDIR-reglene:
> "Minimum 560 timer fordypning fra 2 fagområder (280 timer hver)"

Dette kan tolkes som:
- **A) Totalt 560t fra 2+ fagområder (280t per område = minimum)**
- **B) Totalt 560t fra 2+ fagområder (totalt 560t, fordelt fritt)**

Jeg har implementert **A** (280t per område), men er dette riktig?

**Eksempel:**
- MAT: 420t (R1 + X + R2)
- FYS: 140t

Teller dette som fordypning? Eller må begge fagområdene ha minst 280t?

**→ Svar fra bruker (2024-11-24):**

**KORREKT:** En fordypning = 2 fag fra SAMME fagområde (definert basert på læreplan).

**Eksempel:**
- Matematikk R1 (MAT03-02) + Matematikk R2 (MAT03-02) = 1 fordypning
- Fysikk 1 (FYS01-01) + Fysikk 2 (FYS01-01) = 1 fordypning
- **Totalt:** 2 fordypninger (4 fag)

**IKKE:** Totalt 560t fra 2+ fagområder (min tidligere tolkning var feil!)

**KONSEKVENS:**
- Validering må sjekke: "Har eleven 2 fordypninger?" (ikke "Har eleven 560t fra 2 fagområder?")
- Fordypning = to fag med SAMME læreplankode (fra samme fagområde)
- Må ha minst 2 slike par over VG2+VG3

---

**❓ SPØRSMÅL 2: Spansk I+II i VG3 - hvordan løse timekonflikten?**

Hvis en elev IKKE har fremmedspråk fra ungdomsskolen:
- VG3 må ha: Historie (113t) + Spansk I+II (140t) + 280t fordypning + 1 valgfritt fag (140t)
- Totalt: 113 + 140 + 280 + 140 = 673t

Men valgreglene sier:
- VG3 studiespesialisering: **4 fag totalt** (minAntallFag: 4, maxAntallFag: 4)

Skal vi:
- **A) Tillate 5 fag i VG3 når Spansk I+II er obligatorisk?**
- **B) Tvinge frem Spansk I+II som ett av de 3 programfagene (reduserer fordypning)?**
- **C) Spansk I+II erstatter fordypningskravet (ikke teller mot 280t)?**

**→ Svar fra bruker (2024-11-24):**

**Tvinge inn i 4 fag.** Dersom man har Spansk I+II MÅ dette være ett av de fire fagene.

**KONSEKVENS:**
- VG3 studiespesialisering: 4 fag totalt (inkludert historie)
- Hvis harFremmedsprak = false: Spansk I+II må være ett av de 4 fagene
- Da blir det: Historie + Spansk I+II + 2 programfag (ikke 3)

---

**❓ SPØRSMÅL 3: Historie VG3 - teller mot 4 fag eller separat?**

I blokkskjema står:
```yaml
minAntallFag: 4  # VIKTIG: inkluderer Historie som er obligatorisk
```

Men i praksis:
- Elever velger 3 programfag + Historie = 4 fag totalt

Skal vi:
- **A) Fortsette med 4 fag totalt (3 programfag + historie)**
- **B) Endre til 3 programfag + historie separat (totalt 4 fag, men historie telles ikke i "minAntallFag")**

**→ Svar fra bruker (2024-11-24):**

**A) Teller mot 4 fag.**

En elev på studiespesialiserende skal EGENTLIG bare ha 3 programfag, men for å få likt antall fag i blokkskjema i VG2 og VG3 (praktiske implikasjoner), legges Historie til som et fjerde fag.

**KONSEKVENS:**
- VG3: 4 fag totalt (Historie + 3 programfag)
- Historie telles i "minAntallFag: 4"

---

**❓ SPØRSMÅL 4: Matematikk 2P - teller mot fordypning eller ikke?**

Fra regler.yml:
```yaml
# Matematikk 2P inkludert i fagområde MAT
MAT:
  navn: "Matematikk"
  fag:
    - matematikk-r1
    - matematikk-r2
    - matematikk-s1
    - matematikk-s2
    - matematikk-2p  ← ER MED!
    - matematikk-x
```

Men fra validering (linje 691):
```javascript
const excludedFromFordypning = ['matematikk-2p', 'spansk-i-ii', 'spansk-i-ii-vg3'];
```

Skal 2P telle mot fordypning eller ikke?

**→ Svar fra bruker (2024-11-24):**

Ikke besvart eksplisitt, men basert på at fordypning = 2 fag med samme læreplankode, og at 2P er fellesfag (ikke programfag), antar jeg:

**NEI - Matematikk 2P teller IKKE mot fordypning.**

(Verifiser dette neste gang!)

---

**❓ SPØRSMÅL 5: "historie-vg3" konsoll-advarsler - ønsker du å fjerne dem?**

For historie-vg3 får vi:
```
⚠️ Fag historie-vg3 (Historie Vg3) mangler fagområde - teller ikke mot fordypning
```

Dette er **korrekt oppførsel** (historie er fellesfag, skal IKKE telle mot fordypning).

Men advarselen kan være forvirrende. Skal vi:
- **A) Beholde advarsel (tydeliggjør at historie ikke teller)**
- **B) Fjerne advarsel (skip warning for fellesfag)**
- **C) Endre tekst til: "Histoire er fellesfag - teller ikke mot fordypning (OK)"**

**→ Svar fra bruker (2024-11-24):**

**B) Fjerne advarsel.**

KONSEKVENS:
- Fjern console.warn for historie-vg3 og andre fellesfag
- Kun vise advarsler for programfag som mangler fagområde

---

### 6.2 Oppgaver for videre utvikling

**TODO:**

1. [ ] **Implementer testcases**
   - Lag automatiserte tester for alle 10 testcases
   - Kjør tester i konsoll eller Mocha/Jest

2. [ ] **Fix bugs basert på svar fra bruker**
   - Spørsmål 1: Juster fordypningsberegning
   - Spørsmål 2: Håndter Spansk I+II i VG3
   - Spørsmål 3: Klargjør historie-telling
   - Spørsmål 4: Fix matematikk-2p i fordypning
   - Spørsmål 5: Juster console-advarsler

3. [ ] **Dokumentasjon**
   - Oppdater README.md med valideringsregler
   - Skriv docs/VALIDATION_RULES.md
   - Skriv docs/DATA_FLOW.md

4. [ ] **Deploy**
   - Test lokalt (alle testcases)
   - Commit + push til GitHub
   - Deploy til GitHub Pages
   - Test live på www.bergenprivategymnas.no

---

## 📝 Notater

**Siste oppdatering:** 2024-11-24
**Status:** Venter på svar fra bruker (6 spørsmål)

**Viktige beslutninger:**
- ✅ Studiespesialisering = ÉTT programområde (STREA + STSSA slått sammen)
- ✅ Musikk og Medier forblir separate programmer
- ⏳ Fordypningskrav - venter på klargjøring (280t per område vs totalt 560t)
- ⏳ Spansk I+II VG3 - venter på løsning for timekonflikt
- ⏳ Historie VG3 - venter på klargjøring om den telles i "minAntallFag"

---

**FRA BRUKER:**
_[Legg til kommentarer, spørsmål eller endringer her. Jeg vil lese dette og oppdatere planen]_

---
