# PROMPT FOR NESTE CLAUDE-OKT

Kopier teksten under og lim inn i ny Claude Code-okt:

---

## Start av ny okt - Studieplanlegger videreutvikling

Jeg jobber med Studieplanlegger-appen (`/Users/fredrik/Documents/studieplanlegger`) som er en vanilla JavaScript widget for fagvalg pa videregaende skole. Appen henter data fra school-data API.

### Bakgrunn
I forrige okt jobbet vi med school-data-prosjektet og:
- Fjernet Historie VG3 fra blokkskjema (er obligatorisk fellesfag)
- Korrigerte VG3-tilgjengelighet: Stud har blokk 1-4, MDD kun blokk 2, MK blokk 2-3
- Dokumenterte STREA/STSSA-strukturen og fargepaletten

Les `/Users/fredrik/Documents/studieplanlegger/CLAUDE_PROMPT_NESTE_OKT.md` for full kontekst.

### Oppgave A: Fordypningsvalidering med farger

Implementer visuell STREA/STSSA-klassifisering:

1. **Fargekoding av fag:**
   - STREA (realfag): Gronn `#2E7D32`
   - STSSA (samfunn): Gul `#F9A825`
   - MDD: Rod `#C62828`
   - MK: Bla `#1565C0`
   - Matematikk R: Gronn-gul gradient
   - Matematikk S: Gul-gronn gradient

2. **Fordypningsprofil:**
   - Beregn om eleven har "Realfagsprofil", "Samfunnsprofil" eller "Kombinert"
   - Vis med farge-badge i UI

3. **Filer a endre:**
   - `src/core/validation-service.js` - Legg til STREA/STSSA-klassifisering
   - `src/ui/ui-renderer.js` - Fargekoding av fag-kort
   - `styles/studieplanlegger.css` - CSS-variabler for farger

### Oppgave B: Historie som fast fellesfag

Endre Historie VG3 fra "valgbar slot" til "last fellesfag":

1. **Fjern fra modal:** Historie skal ikke vare valgbar i blokkskjema-modal
2. **Vis som fellesfag:** Legg i egen "Obligatoriske fellesfag VG3"-seksjon
3. **Auto-inkluder i timer:** 421 timer fellesfag (Norsk 168 + Historie 113 + Religion 84 + Kroppsoving 56)

4. **Filer a endre:**
   - `src/ui/ui-renderer.js:611-704` - renderVG3ProgramfagOgHistorie()
   - `src/studieplanlegger.js:1200-1214` - Fjern modal-validering for Historie
   - `src/core/state.js` - Oppdater timeberegning

### Teknisk info

**Arkitektur:**
- Vanilla JS (ingen rammeverk)
- State i `state.js` med slot-basert selections
- Validering i `validation-service.js`
- UI-rendering i `ui-renderer.js`

**API:**
```
https://fredeids-metis.github.io/school-data/api/v2/schools/bergen-private-gymnas/studieplanlegger.json
```

**Fagomrader for fordypning:**
- STREA: MAT, FYS, KJE, BIO, GEO, IT, TOF
- STSSA: SOK, OKO, MOL, ENT, POS, PSY, RET, HIF, ENG, FSP

Start med a lese `CLAUDE_PROMPT_NESTE_OKT.md` og utforsk kodebasen for a forsta eksisterende implementasjon for du gjor endringer.

---
