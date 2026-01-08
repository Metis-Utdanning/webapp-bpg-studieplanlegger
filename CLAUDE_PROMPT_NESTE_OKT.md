# Studieplanlegger - Videreutviklingsplan

## Kontekst fra forrige Claude-okt (school-data)

Vi har jobbet med school-data-prosjektet og gjort folgende endringer:

### Blokkskjema-endringer (BPG 26-27_vedtatt)
- Fjernet Historie VG3 fra alle blokker (er obligatorisk fellesfag)
- Fjernet VG3-oppforinger for niva-1 fag (vises kun i VG2)
- Korrigert VG3-tilgjengelighet per program:
  - Studiespesialisering: Blokk 1-4 (3 fag)
  - Musikk, dans og drama: Kun blokk 2 (1 fag)
  - Medier og kommunikasjon: Blokk 2-3 (2 fag)

### STREA/STSSA-struktur
Studiespesialisering deles fra VG2 i to programomrader:
- **STREA (Realfag)**: Fag med REA-fagkoder (Fysikk, Kjemi, Biologi, Geofag, IT, ToF)
- **STSSA (Sprak/samfunn/okonomi)**: Fag med SAM/SPR-fagkoder (Psykologi, Rettslare, Okonomi, Entreprenorskap, POS-fag, Engelsk)
- **Unntak**: Matematikk R1/R2/S1/S2 har alle REA-koder, men S-matte brukes funksjonelt av STSSA

### Fordypningskrav (kun Studiespesialisering)
- 560 timer totalt fra 2 fagomrader
- 280 timer per fagomrade
- MDD og MK har IKKE fordypningskrav

---

## Fargepalett for programomrader

Skolen bruker folgende farger i presentasjoner og informasjon til elever:

| Programomrade | Farge | Hex-forslag | Bruksomrade |
|---------------|-------|-------------|-------------|
| **Musikk, dans og drama** | Rod-nyanser | `#C62828` / `#EF5350` | MDD-fag, Musikk fordypning |
| **Medier og kommunikasjon** | Bla-nyanser | `#1565C0` / `#42A5F5` | MK-fag, Bilde, Grafisk design |
| **STREA (Realfag)** | Gronn-nyanser | `#2E7D32` / `#66BB6A` | Fysikk, Kjemi, Biologi, Geofag, IT, ToF |
| **STSSA (Samfunn/okonomi)** | Gul-nyanser | `#F9A825` / `#FFCA28` | Psykologi, Rettslare, Okonomi, POS-fag |
| **Matematikk R** | Gronn -> Gul gradient | `#2E7D32` -> `#F9A825` | Viser bade-OG tilhorighet |
| **Matematikk S** | Gul -> Gronn gradient | `#F9A825` -> `#2E7D32` | Viser bade-OG tilhorighet |

### CSS-implementasjon

```css
/* Programomrade-farger */
.program-musikk {
  --program-color: #C62828;
  --program-color-light: #EF5350;
}
.program-medier {
  --program-color: #1565C0;
  --program-color-light: #42A5F5;
}
.program-realfag, .fagomrade-strea {
  --program-color: #2E7D32;
  --program-color-light: #66BB6A;
}
.program-samfunn, .fagomrade-stssa {
  --program-color: #F9A825;
  --program-color-light: #FFCA28;
}

/* Matematikk gradient (bade-OG) */
.fag-matematikk-r {
  background: linear-gradient(135deg, #2E7D32 0%, #66BB6A 50%, #F9A825 100%);
}
.fag-matematikk-s {
  background: linear-gradient(135deg, #F9A825 0%, #FFCA28 50%, #2E7D32 100%);
}

/* Fordypningsstatus badges */
.fordypning-realfag { background-color: #2E7D32; color: white; }
.fordypning-samfunn { background-color: #F9A825; color: black; }
.fordypning-blandet {
  background: linear-gradient(90deg, #2E7D32 50%, #F9A825 50%);
  color: white;
}
```

---

## Mal A: Fordypningsvalidering med STREA/STSSA-stotte

### Bakgrunn
Per UDIR-regler er fordypningskravet teknisk sett program-agnostisk - en elev kan kombinere fag fra alle fagomrader. MEN i praksis velger STREA-elever typisk realfagsomrader og STSSA-elever samfunnsomrader.

### Forslag: Soft guidance, ikke hard restriction
1. **Vis fordypningsstatus** basert pa fagomrader (allerede delvis implementert)
2. **Grupper fag visuelt** etter STREA/STSSA med farger
3. **Vis anbefaling/profil** basert pa valgte fag

### Implementasjon

**Fil: `/src/core/validation-service.js`**

Eksisterende fordypningslogikk (linje 389-492):
```javascript
getFordypningStatus(state, programomrade) {
  // Grupperer fag etter fagomrade
  // Teller fagomrader med 2+ fag
  // Sjekker mot minOmrader (2)
}
```

**Endring nodvendig:**
```javascript
// Legg til STREA/STSSA-klassifisering
const STREA_OMRADER = ['MAT', 'FYS', 'KJE', 'BIO', 'GEO', 'IT', 'TOF'];
const STSSA_OMRADER = ['SOK', 'OKO', 'MOL', 'ENT', 'POS', 'PSY', 'RET', 'HIF', 'ENG', 'FSP'];

// Fargeklassifisering for UI
const FAGOMRADE_FARGER = {
  // STREA (gronn)
  MAT: 'realfag', FYS: 'realfag', KJE: 'realfag',
  BIO: 'realfag', GEO: 'realfag', IT: 'realfag', TOF: 'realfag',
  // STSSA (gul)
  SOK: 'samfunn', OKO: 'samfunn', MOL: 'samfunn', ENT: 'samfunn',
  POS: 'samfunn', PSY: 'samfunn', RET: 'samfunn', HIF: 'samfunn',
  ENG: 'samfunn', FSP: 'samfunn',
  // MDD (rod)
  MUS: 'musikk',
  // MK (bla)
  KUN: 'medier'
};

getFordypningStatus(state, programomrade) {
  // ... eksisterende logikk ...

  // NY: Klassifiser oppfylte omrader
  const streaOmrader = oppfylteOmrader.filter(o => STREA_OMRADER.includes(o));
  const stssaOmrader = oppfylteOmrader.filter(o => STSSA_OMRADER.includes(o));

  return {
    oppfylt: oppfylteOmrader.length >= 2,
    omrader: oppfylteOmrader,
    streaCount: streaOmrader.length,
    stssaCount: stssaOmrader.length,
    profil: this.getProfil(streaOmrader, stssaOmrader),
    profilFarge: this.getProfilFarge(streaOmrader, stssaOmrader)
  };
}

getProfil(strea, stssa) {
  if (strea.length >= 2 && stssa.length === 0) return 'Realfagsprofil';
  if (stssa.length >= 2 && strea.length === 0) return 'Samfunnsprofil';
  if (strea.length >= 1 && stssa.length >= 1) return 'Kombinert profil';
  return null;
}

getProfilFarge(strea, stssa) {
  if (strea.length >= 2 && stssa.length === 0) return 'realfag'; // gronn
  if (stssa.length >= 2 && strea.length === 0) return 'samfunn'; // gul
  return 'blandet'; // gradient
}
```

### UI-visning (ui-renderer.js)

Vis fordypningsstatus med farge-indikator:
```html
<div class="fordypning-status ${profilFarge}">
  <span class="fordypning-count">2/2 fordypninger oppfylt</span>
  <span class="fordypning-profil">${profil}</span>
</div>
```

### Fag-kort med programomrade-farge

```javascript
renderFagCard(fag) {
  const omrade = this.getFagomrade(fag.id);
  const fargeKlasse = FAGOMRADE_FARGER[omrade] || 'default';

  // Spesialhåndtering for matematikk
  if (fag.id.startsWith('matematikk-r')) {
    return `<div class="fag-card fag-matematikk-r">...`;
  }
  if (fag.id.startsWith('matematikk-s')) {
    return `<div class="fag-card fag-matematikk-s">...`;
  }

  return `<div class="fag-card fagomrade-${fargeKlasse}">...`;
}
```

---

## Mal B: Historie VG3 som fast fellesfag

### Navarende tilstand
Historie handteres spesielt i koden (ui-renderer.js:611-704), men vises fortsatt som "valgbar slot" i VG3-modalen.

### Mal
Historie skal vises som "last" fellesfag - identisk med Religion og etikk, Norsk VG3, Kroppsoving VG3.

### Nokkelfiler og linjer

| Fil | Linjer | Formal |
|-----|--------|--------|
| `ui-renderer.js` | 547-548 | Filtrerer ut Historie fra fellesfag-liste |
| `ui-renderer.js` | 611-704 | renderVG3ProgramfagOgHistorie() |
| `studieplanlegger.js` | 612-618 | Click handler for historie-seksjon |
| `studieplanlegger.js` | 1200-1214 | Modal-validering (krever Historie) |

### Implementasjonsplan

**Steg 1: Fjern Historie fra blokkskjema-modal**

I `studieplanlegger.js`, endre renderBlokkskjemaModal():
```javascript
// Filtrer ut historie-vg3 fra fag-listen
const filteredFag = blokk.fag.filter(f =>
  f.id !== 'historie-vg3' && f.fagkode !== 'HIS1010'
);
```

**Steg 2: Vis Historie som fast fellesfag i VG3-kolonne**

I `ui-renderer.js`, endre renderVG3Kolonne():
```javascript
renderVG3Kolonne() {
  const fellesfag = this.dataHandler.getFellesfag('studiespesialisering', 'vg3');

  return `
    <div class="sp-vg3-fellesfag">
      <h4>Obligatoriske fellesfag VG3</h4>
      ${fellesfag.map(fag => `
        <div class="sp-fellesfag-item locked">
          <span class="sp-fag-navn">${fag.title}</span>
          <span class="sp-fag-timer">${fag.timer}t</span>
        </div>
      `).join('')}
      <div class="sp-fellesfag-total">
        Totalt: ${fellesfag.reduce((sum, f) => sum + f.timer, 0)} timer
      </div>
    </div>

    <div class="sp-vg3-programfag">
      <h4>Valgfrie programfag VG3</h4>
      <!-- Eksisterende programfag-bokser -->
    </div>
  `;
}
```

**Steg 3: Oppdater timeberegning**

I `state.js` eller `validation-service.js`:
```javascript
getVG3TotalTimer(state) {
  const fellesfagTimer = 421; // Norsk 168 + Historie 113 + Religion 84 + Kroppsoving 56
  const programfagTimer = state.vg3.selections
    .filter(f => f.type === 'programfag')
    .reduce((sum, f) => sum + f.timer, 0);

  return { fellesfag: fellesfagTimer, programfag: programfagTimer };
}
```

**Steg 4: Fjern modal-validering for Historie**

I `studieplanlegger.js`, linje 1200-1214:
```javascript
// FJERN denne valideringen - Historie er ikke lenger valgbar
// if (currentTrinn === 'vg3') {
//   const historieFag = this.selectedBlokkskjemaFag.find(...);
//   if (!historieFag) { ... }
// }
```

---

## Teknisk arkitektur

### Filstruktur
```
studieplanlegger/
├── src/
│   ├── core/
│   │   ├── data-handler.js       # API-henting, blokkskjema-data
│   │   ├── state.js              # State management, selections
│   │   └── validation-service.js # Regler, fordypning, forutsetninger
│   ├── ui/
│   │   └── ui-renderer.js        # Template rendering
│   └── studieplanlegger.js       # Main class, modaler, events
├── styles/
│   └── studieplanlegger.css      # Styling inkl. fargepalett
```

### State-struktur
```javascript
state = {
  trinn: 'vg2' | 'vg3',
  programomrade: 'studiespesialisering' | 'musikk-dans-drama' | 'medier-kommunikasjon',
  harFremmedsprak: true | false,
  vg1: { selections: [...] },
  vg2: { selections: [...] },
  vg3: { selections: [...] }  // Kun programfag - fellesfag er automatisk
}
```

### API-endepunkt
```
https://fredeids-metis.github.io/school-data/api/v2/schools/bergen-private-gymnas/studieplanlegger.json
```

---

## Sjekkliste for implementasjon

### Del A: Fordypning med STREA/STSSA og farger
- [ ] Legg til STREA_OMRADER og STSSA_OMRADER konstanter
- [ ] Legg til FAGOMRADE_FARGER mapping
- [ ] Utvid getFordypningStatus() med profil og profilFarge
- [ ] Implementer CSS-variabler for fargepalett
- [ ] Implementer gradient for Matematikk R/S
- [ ] Oppdater fag-kort rendering med farger
- [ ] Vis fordypningsprofil med farge-badge
- [ ] Test med ulike fagkombinasjoner

### Del B: Historie som fellesfag
- [ ] Fjern Historie fra blokkskjema-modal rendering
- [ ] Legg til "Obligatoriske fellesfag VG3"-seksjon i UI
- [ ] Inkluder alle VG3 fellesfag (Historie, Religion, Norsk, Kroppsoving)
- [ ] Oppdater timeberegning til a inkludere fellesfag automatisk
- [ ] Fjern modal-validering som krever Historie-valg
- [ ] Test at fellesfag vises som "locked"

---

## Testscenarier

### Fordypning med farger
1. Stud velger Fysikk 1+2, Kjemi 1+2 -> Gronn "Realfagsprofil"
2. Stud velger Psykologi 1+2, Rettslare 1+2 -> Gul "Samfunnsprofil"
3. Stud velger Fysikk 1+2, Psykologi 1+2 -> Gradient "Kombinert profil"
4. Stud velger R1+R2 -> Gronn-gul gradient pa matematikk-kort
5. Stud velger S1+S2 -> Gul-gronn gradient pa matematikk-kort

### Historie
1. VG3 Stud: Historie vises i fellesfag-seksjon, ikke i modal
2. VG3 MDD: Historie vises i fellesfag-seksjon
3. VG3 MK: Historie vises i fellesfag-seksjon
4. Timeberegning inkluderer 421 timer fellesfag automatisk

---

## Referanser

- school-data repo: `/Users/fredrik/Documents/school-data`
- studieplanlegger repo: `/Users/fredrik/Documents/studieplanlegger`
- API-dokumentasjon: `school-data/CLAUDE.md`
- Fordypningsregler: `school-data/data/udir/regler/fordypning.yml`
- Blokkskjema BPG: `school-data/data/skoler/bergen-private-gymnas/blokkskjema/26-27_vedtatt.yml`
