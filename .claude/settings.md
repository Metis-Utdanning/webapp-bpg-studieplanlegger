# Arbeidsflyt for Studieplanlegger-prosjektet

## Prosjektkontekst
Les CLAUDE.md for full prosjektoversikt. Dette er en interaktiv studieplanlegger-widget for Bergen Private Gymnas.

## Tilgjengelige agenter

| Agent | Modell | Bruksområde |
|-------|--------|-------------|
| **debug-tester** | Sonnet | Systematisk debugging, feilsøking, trace errors, verifisere fixes |
| **documentation-expert** | Opus | Skrive/oppdatere dokumentasjon, CHANGELOG, README, API-docs |
| **ux-ui-expert** | Sonnet | UX-design, UI-forbedringer, tilgjengelighet, WCAG-compliance |
| **web-developer** | Opus | HTML/CSS/JS, responsive design, API-integrasjon, browser-issues |

Innebygde agenter:
- **Explore** - Rask utforsking av kodebasen
- **Plan** - Planlegging av komplekse oppgaver
- **claude-code-guide** - Hjelp med Claude Code-funksjoner

## Standard arbeidsflyt

### 1. Start av økt
- Les gjennom CLAUDE.md og docs/CHANGELOG.md for kontekst
- Bruk TodoWrite for å planlegge oppgaver hvis det er flere steg
- Sjekk git status for å se ucommittede endringer

### 2. Under arbeid
- **Utforsking**: Bruk Explore-agent for å forstå kodebasen
- **Debugging**: Bruk debug-tester agent for feilsøking
- **UX/Design**: Bruk ux-ui-expert for design-beslutninger
- **Implementering**: Bruk web-developer for kompleks frontend-kode
- **Dokumentasjon**: Bruk documentation-expert ved større endringer

### 3. Avslutning av økt
- Oppdater dokumentasjon med documentation-expert
- Commit og push endringer til GitHub
- Gi en kort oppsummering av hva som ble gjort og hva som gjenstår

## Viktige filer
- `src/studieplanlegger.js` - Hovedlogikk og modaler
- `src/core/state.js` - State management
- `src/core/validation-service.js` - Fordypning og konflikter
- `data/curriculum/regler.yml` - Valideringsregler (SINGLE SOURCE OF TRUTH)
- `data/schools/bergen-private-gymnas/blokkskjema_v2.yml` - Blokkstruktur

## Testing
- Lokal server: `python3 -m http.server 8000`
- Demo: http://localhost:8000/public/demo.html
- Console debugging: `window.studieplanlegger.state.getState()`

## Kvalitetskrav
- Ikke endre kode uten å lese den først
- Test endringer lokalt før commit
- Hold løsninger enkle - unngå over-engineering
- Commit ofte med beskrivende meldinger
