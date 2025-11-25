# Analyse: PDF-Eksport for Studieplanlegger

> **Dato:** 2024-11-25
> **Status:** Analyse ferdig, ikke implementert
> **Formål:** Utforske muligheter for PDF-eksport av elevens studieplan

---

## Executive Summary

Prosjektet har **ingen eksisterende PDF-funksjonalitet**. Anbefalt løsning er **Print CSS** som første steg (zero overhead), med mulighet for **html2pdf.js** hvis direkte nedlasting er ønsket.

---

## 1. Teknologivalg - Sammenligning

### Alternativ A: Print CSS (@media print) ⭐ ANBEFALT

**Hvordan det fungerer:**
- CSS `@media print` regler
- Bruker browser's innebygde print-to-PDF (Ctrl/Cmd+P → "Lagre som PDF")
- Ingen JavaScript eller dependencies nødvendig

**Fordeler:**
- ✅ Zero bundle overhead
- ✅ Fungerer embedded på Squarespace
- ✅ Velebar tekst i PDF
- ✅ Full Unicode-støtte (æøå)
- ✅ Cross-browser kompatibel
- ✅ Enkel vedlikehold - bare CSS

**Ulemper:**
- Krever manuelt trykk fra bruker
- Begrenset branding-kontroll (headere/footere)

**Estimert implementeringstid:** 30-45 minutter

---

### Alternativ B: html2pdf.js (html2canvas + jsPDF)

**Hvordan det fungerer:**
1. `html2canvas` konverterer DOM → Canvas (screenshot)
2. `jsPDF` konverterer Canvas → PDF
3. Bevarer CSS-styling automatisk

**Bundle size:** ~150KB (eller ~100KB lite-versjoner)

**Fordeler:**
- ✅ Direkte download uten print-dialog
- ✅ Custom headere/footere med logo
- ✅ Full kontroll over output

**Ulemper:**
- Større bundle size
- Tekst ikke velebar (rasterisert bilde)
- Kan ha CORS-issues på Squarespace

**Estimert implementeringstid:** 1-2 timer

---

### Alternativ C: Ren jsPDF

**Hvordan det fungerer:**
- Programmatisk bygging av PDF med koordinater
- Full kontroll over hvert element

**Bundle size:** ~30KB

**Ulemper:**
- ❌ Svært arbeidskrevende
- ❌ Må programmere hver visuelle detalj manuelt
- ❌ Vanskelig å vedlikeholde

**Anbefales ikke** for dette prosjektet.

---

### Alternativ D: Server-side (Puppeteer)

**Når nødvendig:**
- Batch-generering
- Garantert konsistent rendering

**Status:** ❌ Ikke aktuelt - krever backend, GitHub Pages er statisk

---

## 2. Data Tilgjengelig for PDF

### State-struktur
```javascript
const state = window.studieplanlegger.state.getState();

// Returnerer:
{
  programomrade: 'studiespesialisering',
  harFremmedsprak: true,

  vg1: {
    selections: [
      { id, navn, timer, fagkode, type, slot }
    ]
  },
  vg2: {
    selections: [
      { id, navn, timer, fagkode, type, slot, blokkId }
    ]
  },
  vg3: {
    selections: [
      { id, navn, timer, fagkode, type, slot, blokkId }
    ]
  }
}
```

### Validerings-data
```javascript
// Fordypning-status
const fordypning = window.studieplanlegger.validator.getFordypningStatus(state);
// Returnerer: { antallFordypninger, requiredFordypninger, isValid, areas: [...] }

// Komplett validering
const validation = state.validate();
// Returnerer: { vg1Complete, vg2Complete, vg3Complete, isComplete, errors }
```

### Timer-beregning
```javascript
const vg2Timer = state.calculateProgramfagHours('vg2');
const vg3Timer = state.calculateProgramfagHours('vg3');
```

---

## 3. PDF Layout-Design (A4)

### Sidestruktur
```
┌────────────────────────────────────────────┐
│         HEADER                             │
│  Bergen Private Gymnas                     │
│  Studieplan                                │
├────────────────────────────────────────────┤
│  ELEVINFO                                  │
│  Programområde: Studiespesialisering       │
│  Dato: 25.11.2025                          │
├──────────────┬──────────────┬──────────────┤
│     VG1      │     VG2      │     VG3      │
│──────────────│──────────────│──────────────│
│  Fellesfag   │  Matematikk: │  Historie:   │
│  - Norsk     │  - R1 (140t) │  - His (113t)│
│  - Engelsk   │              │              │
│  - Naturfag  │  Programfag: │  Programfag: │
│              │  - Fysikk 1  │  - Fysikk 2  │
│  Matematikk: │  - Kjemi 1   │  - Kjemi 2   │
│  - 1P (140t) │  - Bio 1     │  - Bio 2     │
│              │              │              │
│  Fremmedspr: │  Total: 560t │  Total: 533t │
│  - Spansk I  │              │              │
├──────────────┴──────────────┴──────────────┤
│  FORDYPNING STATUS                         │
│  ✓ 2 av 2 fordypninger oppnådd            │
│  • Fysikk (Fysikk 1 + Fysikk 2)           │
│  • Kjemi (Kjemi 1 + Kjemi 2)              │
├────────────────────────────────────────────┤
│  Dato: 25.11.2025 | Bergen Private Gymnas  │
└────────────────────────────────────────────┘
```

### Farger for Print
```css
/* Primærfarger (tone ned for print) */
--print-primary: #1F4739;      /* Mørkegrønn */
--print-accent: #E8F5A3;       /* Lys lime */
--print-text: #333;            /* Mørk grå (ikke svart) */
--print-muted: #666;           /* Medium grå */
--print-border: #ddd;          /* Lys grå kant */

/* Validering */
--print-success: #4CAF50;      /* Grønn ✓ */
--print-error: #d32f2f;        /* Rød ✗ */
```

---

## 4. Implementasjonsplan

### Fase 1: Print CSS (Anbefalt start)

**Ny fil:** `styles/print.css`

```css
@media print {
  /* Skjul interaktive elementer */
  .sp-filter-section,
  .sp-modal,
  .sp-fag-item-info,
  .sp-fjern-valg-btn,
  .sp-feedback-section,
  .sp-validering {
    display: none !important;
  }

  /* Optimaliser layout */
  #studieplanlegger-widget {
    background: white;
    padding: 0;
    max-width: 100%;
  }

  .sp-vg-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }

  .sp-vg-column {
    page-break-inside: avoid;
    box-shadow: none;
    border: 1px solid #ddd;
  }

  .sp-vg-header {
    background: #1F4739 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* A4 sideinnstillinger */
  @page {
    size: A4;
    margin: 15mm;
  }
}
```

**UI-knapp:**
```html
<button class="sp-print-btn" onclick="window.print()">
  📄 Skriv ut / Last ned PDF
</button>
```

### Fase 2: Eksport-knapp i UI (ui-renderer.js)

```javascript
renderExportButton() {
  return `
    <div class="sp-export-section">
      <button class="sp-print-btn" onclick="window.print()">
        📄 Skriv ut studieplan
      </button>
    </div>
  `;
}
```

### Fase 3: Print-spesifikk header/footer (Valgfritt)

Legg til print-only header med skolelogo og dato:

```css
.sp-print-header {
  display: none;
}

@media print {
  .sp-print-header {
    display: block;
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #1F4739;
  }
}
```

---

## 5. Alternativ: html2pdf.js Implementering

Hvis direkte download er ønsket:

**CDN-import (embed.html):**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

**JavaScript:**
```javascript
async function exportToPDF() {
  const element = document.getElementById('studieplanlegger-widget');

  // Skjul elementer midlertidig
  const hideElements = element.querySelectorAll('.sp-modal, .sp-filter-section');
  hideElements.forEach(el => el.style.display = 'none');

  const opt = {
    margin: 10,
    filename: 'min-studieplan.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  await html2pdf().set(opt).from(element).save();

  // Vis elementer igjen
  hideElements.forEach(el => el.style.display = '');
}
```

---

## 6. Anbefaling

### Trinn 1: Start med Print CSS
- Zero overhead
- Fungerer umiddelbart
- Bruker kan velge "Lagre som PDF" i print-dialog
- **Estimert tid:** 30-45 minutter

### Trinn 2: Evaluer behov
- Hvis brukere klager på print-dialog → legg til html2pdf.js
- Hvis branding er viktig → legg til print-spesifikk header

### Trinn 3: Valgfritt - html2pdf.js
- Bare hvis direkte download er kritisk
- **Estimert ekstra tid:** 1 time

---

## 7. Eksempel: Data for PDF

```json
{
  "metadata": {
    "skole": "Bergen Private Gymnas",
    "programomrade": "Studiespesialisering",
    "dato": "25.11.2025"
  },
  "vg1": {
    "timer_total": 253,
    "fag": [
      { "navn": "Matematikk 1P", "timer": 140 },
      { "navn": "Spansk I", "timer": 113 }
    ]
  },
  "vg2": {
    "timer_total": 560,
    "matematikk": { "navn": "Matematikk R1", "timer": 140 },
    "programfag": [
      { "navn": "Fysikk 1", "timer": 140 },
      { "navn": "Kjemi 1", "timer": 140 },
      { "navn": "Biologi 1", "timer": 140 }
    ]
  },
  "vg3": {
    "timer_total": 533,
    "historie": { "navn": "Historie", "timer": 113 },
    "programfag": [
      { "navn": "Fysikk 2", "timer": 140 },
      { "navn": "Kjemi 2", "timer": 140 },
      { "navn": "Biologi 2", "timer": 140 }
    ]
  },
  "fordypning": {
    "oppnadd": 2,
    "krevd": 2,
    "status": "oppfylt",
    "omrader": ["Fysikk", "Kjemi"]
  }
}
```

---

## 8. Konklusjon

| Løsning | Anbefaling | Når |
|---------|------------|-----|
| **Print CSS** | ⭐ Start her | Alltid - zero cost |
| **html2pdf.js** | Valgfritt | Hvis direkte download kreves |
| **jsPDF manuell** | Nei | For kompleks, ikke verdt det |
| **Server-side** | Nei | Ingen backend tilgjengelig |

**Neste steg:** Implementer Print CSS først, test i browser, evaluer om mer trengs.
