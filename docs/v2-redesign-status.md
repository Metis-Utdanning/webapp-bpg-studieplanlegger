# Studieplanlegger V2 Redesign - Status

**Sist oppdatert:** 2026-01-06

## Oversikt

Redesign av studieplanlegger med ny brukerflyt og moderne UI. Målet er en step-basert opplevelse som guider elevene gjennom fagvalg.

## Implementert

### Del 1: Onboarding Wizard
**Status:** Ferdig

- Horisontal slide-basert wizard
- 3 spørsmål: Trinn, Programområde, Fremmedspråk-status
- Auto-advance ved valg
- Lagres i localStorage

**Fil:** `src/ui/components/flow-stepper.js` → `FlowOnboarding`

### Del 2: Step-basert fagvalg
**Status:** Ferdig

#### Del 2.1: VG1 Fagvalg
- Side-by-side layout for Matematikk og Fremmedspråk
- Radio-style valg med visuell feedback
- Auto-advance når begge er valgt
- "Nullstill"-knapp på første steg

**Fil:** `src/ui/components/flow-steps.js` → `VG1Step`

#### Del 2.2 & 2.3: VG2/VG3 Fagvalg (Blokkskjema)
- Grid-layout med blokker
- Fag-kort med status (valgt, blokkert, advarsel)
- Fremdriftsindikator
- Tags for valgte fag
- Støtte for projection-modus (VG3 for VG1-elever)
- Støtte for retrospective-modus (tilbakeblikk for VG2-elever)

**Fil:** `src/ui/components/flow-steps.js` → `BlokkskjemaStep`

### Del 3: Overgang til 3-kolonnevisning
**Status:** Ferdig (grunnleggende)

- Når alle steg er fullført, vises 3-kolonnevisning
- Bruker eksisterende `renderWithFlow()` fra base-implementasjonen

### StepRenderer
- Koordinerer hvilken step som vises
- Håndterer navigasjon (neste/tilbake)
- Kaller callbacks ved fullføring/reset

**Fil:** `src/ui/components/flow-steps.js` → `StepRenderer`

## Filstruktur

```
src/
├── studieplanlegger-v2.js      # Hovedklasse V2 (oppdatert)
├── flows/
│   └── flow-controller.js      # Steg-logikk og validering
└── ui/components/
    ├── flow-stepper.js         # FlowOnboarding, FlowStepper, FlowNavigation
    └── flow-steps.js           # VG1Step, BlokkskjemaStep, StepRenderer (NY)

styles/v2/
└── redesign.css                # Komplett CSS design system (oppdatert)

public/
└── demo-redesign.html          # Test-side
```

## Brukerflyt

### VG1-elev (velger for VG2)
```
Onboarding → VG1 fagvalg → VG2 fagvalg → VG3 projeksjon → 3-kolonnevisning
```

### VG2-elev (velger for VG3)
```
Onboarding → VG1 tilbakeblikk → VG2 tilbakeblikk → VG3 fagvalg → 3-kolonnevisning
```

## CSS-variabler lagt til

```css
--sp-v2-success-soft: #d8f0e0;
--sp-v2-warning-soft: #ffedd5;
--sp-v2-error-soft: #fde5e5;
```

## Nye CSS-klasser

- `.sp-v2-step-screen` - Fullskjerm step-container
- `.sp-v2-vg1-grid`, `.sp-v2-vg1-section`, `.sp-v2-vg1-option` - VG1 layout
- `.sp-v2-blokkskjema`, `.sp-v2-blokk`, `.sp-v2-fag` - Blokkskjema layout
- `.sp-v2-selection-summary`, `.sp-v2-tag` - Valg-oppsummering
- `.sp-v2-info-banner` - Info-bannere (projection/retrospective)
- `.sp-v2-btn--ghost` - Transparent knappestil
- `.sp-v2-step-nav` - Step-navigasjon

## Ikke testet / Potensielle issues

1. **Blokkskjema-data:** Sjekk at `getFagForProgramOgTrinn()` returnerer korrekt struktur
2. **State-synkronisering:** Verifiser at valg lagres riktig i state
3. **Validering:** Test at canProceed-logikken fungerer for alle steg
4. **Mobile responsivitet:** Test på mindre skjermer
5. **Tilbake-navigasjon:** Verifiser at tilbake-knapp fungerer korrekt

## Testing

```bash
# Start dev-server
npm run dev

# Åpne i nettleser
http://localhost:8000/public/demo-redesign.html
```

## Neste steg

1. **Test hele flyten** i nettleser
2. **Fiks eventuelle bugs** som dukker opp
3. **Finjuster UI** basert på testing
4. **Legg til animasjoner** for step-overganger
5. **Forbedre 3-kolonnevisning** (Del 3)

## Git-status

Branch: `main` (eller `redesign/v2-ui` hvis opprettet)

Filer endret:
- `src/studieplanlegger-v2.js`
- `src/ui/components/flow-steps.js` (NY)
- `styles/v2/redesign.css`
