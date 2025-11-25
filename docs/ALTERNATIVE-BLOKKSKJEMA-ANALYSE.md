# Analyse: Alternative Blokkskjema i Studieplanlegger

> **Dato:** 2024-11-25
> **Status:** Analyse ferdig, ikke implementert
> **Formål:** Utforske muligheter for å støtte multiple/alternative blokkskjema

---

## Executive Summary

Systemet er **~90% forberedt** for alternative blokkskjema. UI-laget er helt dynamisk og rendres fra API-data. De viktigste begrensningene ligger i:
1. Build-scriptet (hardkodet til én fil)
2. Noen hardkodede fag-ID-referanser i frontend
3. DataHandler som kun laster ett skjema

---

## 1. Nåværende Dataflyt

```
blokkskjema_v2.yml
       ↓
npm run build (build-api.cjs)
       ↓
studieplanlegger.json
       ↓
DataHandler.loadAll()
       ↓
getFagForProgramOgTrinn(program, trinn)
       ↓
renderBlokkskjemaContent()  →  Modal UI
       ↓
setTrinnSelections()  →  State med blokkId
```

**Kritisk funn:** `blokkId` lagres allerede i state for hvert valgt fag - dette er nødvendig for multi-skjema-støtte.

---

## 2. Tre Mulige Tilnærminger

### Alternativ A: Separate API-filer per versjon
```
dist/api/v2/schools/bergen-private-gymnas/
├── studieplanlegger.json           # Standard (v2)
├── studieplanlegger-2024.json      # Arkiv
└── studieplanlegger-2025.json      # Ny versjon
```

**Fordeler:** Minimal endring i frontend, god cache-håndtering
**Ulemper:** Krever page reload ved versjonbytte

### Alternativ B: Alle versjoner i én API-respons (Anbefalt)
```json
{
  "blokkskjemaer": {
    "v2": { "blokker": {...} },
    "v2025": { "blokker": {...} }
  },
  "aktivVersjon": "v2"
}
```

**Fordeler:** Toggle uten reload, sammenligning mulig
**Ulemper:** Større payload, mer kompleks state

### Alternativ C: Versjon som URL-parameter
```
/studieplanlegger.json?version=v2025
```

**Fordeler:** Fleksibelt, SEO-vennlig for spesifikke versjoner
**Ulemper:** Krever backend-logikk eller GitHub Actions

---

## 3. Hva Må Endres per Alternativ

### For Alternativ B (Toggle i samme session) - Anbefalt

| Komponent | Endring | Kompleksitet |
|-----------|---------|--------------|
| **build-api.cjs** | Les alle `blokkskjema_*.yml`, bygg til `blokkskjemaer: {}` | Medium |
| **school-config.yml** | Definer tilgjengelige versjoner og aktiv default | Lav |
| **DataHandler** | Ny metode `getBlokkskjema(versjon)` | Lav |
| **State** | Nytt felt `aktivBlokkskjemaVersjon` | Lav |
| **UI (filter)** | Ny dropdown/toggle for versjonvalg | Medium |
| **Modal** | Bruk `aktivBlokkskjemaVersjon` ved rendering | Lav |

---

## 4. Hardkodede Avhengigheter å Fikse

Disse stedene antar spesifikke fag-IDer eller strukturer:

| Fil | Linje | Problem | Løsning |
|-----|-------|---------|---------|
| `studieplanlegger.js` | 467-478 | `matematikk-*`, `historie-vg3`, `spansk-i-ii` hardkodet | Flytt til config i blokkskjema |
| `state.js` | 167-177 | `isMath()`, `isHistorie()` sjekker hardkodede IDer | Les fra `blokkskjema.specialFag` |
| `studieplanlegger.js` | 483 | Sorterer `historie-vg3` først | Definer sortering i YAML |
| `validation-service.js` | 416-450 | `excludedFromFordypning` hardkodet | Flytt til regler.yml |

---

## 5. Foreslått YAML-Struktur for Multi-Versjon

```yaml
# school-config.yml
blokkskjema:
  aktivVersjon: "v2025"
  tilgjengeligeVersjoner:
    - id: "v2"
      fil: "blokkskjema_v2.yml"
      navn: "Standard 2024"
      aktiv: false
    - id: "v2025"
      fil: "blokkskjema_v2025.yml"
      navn: "Pilot 2025"
      aktiv: true
```

```yaml
# blokkskjema_v2025.yml
versjon: "v2025"
metadata:
  navn: "Blokkskjema 2025 - Pilot"
  gyldigFra: "2025-08-01"
  beskrivelse: "Nytt blokkskjema med utvidet realfagstilbud"

struktur:
  antallBlokker: 5  # Kan variere per versjon!
  navnBlokker: ["Blokk A", "Blokk B", "Blokk C", "Blokk D", "Blokk E"]

  # NYTT: Definer spesialfag per versjon
  spesialFag:
    matematikk:
      pattern: "^matematikk-"
      slot: "matematikk"
    historie:
      ids: ["historie-vg3"]
      slot: "historie"
    obligatoriskFremmedsprak:
      ids: ["spansk-i-ii"]
      betingelse: "!harFremmedsprak"

blokker:
  # ... som før
```

---

## 6. Arbeidsflyt for Å Legge Til Nytt Blokkskjema

Med foreslåtte endringer vil arbeidsflyten være:

1. **Opprett ny YAML-fil:**
   ```bash
   cp data/schools/bergen-private-gymnas/blokkskjema_v2.yml \
      data/schools/bergen-private-gymnas/blokkskjema_v2025.yml
   ```

2. **Rediger school-config.yml:**
   ```yaml
   blokkskjema:
     aktivVersjon: "v2025"
     tilgjengeligeVersjoner:
       - id: "v2025"
         fil: "blokkskjema_v2025.yml"
   ```

3. **Kjør build:**
   ```bash
   npm run build
   ```

4. **Test toggle i UI** (ny funksjonalitet)

---

## 7. UI-Konsept for Versjon-Toggle

```
┌─────────────────────────────────────────────────────┐
│  Velg programområde:  [Studiespesialisering ▼]      │
│                                                      │
│  Blokkskjema versjon: [● Standard 2024] [○ Pilot 2025] │
│                                                      │
│  Hadde du fremmedspråk? [Ja] [Nei]   [Fjern alle valg] │
└─────────────────────────────────────────────────────┘
```

Alternativt kan versjon velges **inne i blokkskjema-modalen** med en info-banner:

```
┌─────────────────────────────────────────────────────┐
│  ℹ️ Du ser: Standard 2024                           │
│     Bytt til: [Pilot 2025 →]                        │
└─────────────────────────────────────────────────────┘
```

---

## 8. Implementasjonsplan

| Fase | Oppgave | Filer |
|------|---------|-------|
| **Fase 1** | Utvid build-script til å støtte flere YAML-filer | `build-api.cjs` |
| **Fase 2** | Legg til versjon-selector i UI | `ui-renderer.js`, CSS |
| **Fase 3** | Oppdater DataHandler med `getBlokkskjema(versjon)` | `data-handler.js` |
| **Fase 4** | Legg til `aktivBlokkskjemaVersjon` i state | `state.js` |
| **Fase 5** | Fjern hardkodede fag-IDer, bruk config | `studieplanlegger.js`, `validation-service.js` |
| **Fase 6** | Test og dokumenter | README, CLAUDE.md |

---

## 9. Konklusjon

**"Kan man ha lastet parallelle skjema som toggles?"**
→ **Ja**, med Alternativ B. All data lastes i én request, toggle skjer client-side uten reload.

**"Hva skal til for å endre?"**
→ Hovedsakelig build-script + DataHandler + UI-toggle. State og validering er allerede forberedt.

**"Hvordan vil arbeidsflyten se ut?"**
→ Kopier YAML → Rediger → Legg til i config → Build → Toggle i UI

---

## Anbefaling

**Alternativ B** (alle versjoner i én API-respons) anbefales fordi:
- Enklest brukeropplevelse (ingen reload)
- Muliggjør sammenligning av versjoner
- State-strukturen støtter det allerede (`blokkId` lagres)
- UI-komponenten er 100% dynamisk
