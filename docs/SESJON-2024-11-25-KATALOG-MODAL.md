# Sesjon: Katalog-Modal Redesign

> **Dato:** 2024-11-25
> **Status:** Ferdig implementert
> **Formal:** Forbedre fag-modal med bilder, hero-design og kortere titler

---

## Sammendrag

Denne sesjonen fokuserte pa a forbedre brukeropplevelsen i fag-modal (katalog-visning) ved a:
1. Implementere et bildesystem for fagbilder
2. Legge til hero-design med gradient overlay
3. Fikse en kritisk bug med info-knapper
4. Legge til stotte for korte fagnavn (shortTitle)

---

## 1. Bildesystem for Fag

### Implementasjon

**Ny mappestruktur:**
```
public/
  images/
    fag/
      fysikk-1.jpg
      kjemi-1.jpg
      ...
```

**Markdown frontmatter-stotte:**
```yaml
---
title: Fysikk 1
fagkode: REA3004
timer: 140
bilde: fysikk-1.jpg
vimeo: 123456789  # Fremtidig video-stotte
---
```

**Build-script endringer (`scripts/build-api.cjs`):**
- Leser `bilde` og `vimeo` fra frontmatter
- Inkluderer disse feltene i JSON API-output

### Bruk i kode

```javascript
// I renderFagModal():
const imageUrl = fag.bilde
  ? `/public/images/fag/${fag.bilde}`
  : null;
```

---

## 2. Hero-Design for Modal

### Visuelt konsept

```
+------------------------------------------+
|                                          |
|    [Bilde med gradient overlay]          |
|                                          |
|    Fysikk 1                              |
|    REA3004 | Gir fordypning i Fysikk     |
|                                          |
+------------------------------------------+
|                                          |
|    Beskrivelse av faget...               |
|                                          |
+------------------------------------------+
```

### CSS-implementasjon (`styles/components/modal.css`)

```css
.sp-fag-modal-hero {
  position: relative;
  min-height: 200px;
  background-size: cover;
  background-position: center;
}

.sp-fag-modal-hero::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
}

.sp-fag-modal-hero-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem;
  color: white;
  z-index: 1;
}
```

### Fallback for fag uten bilde

Fag uten definert bilde far en gronn gradient-bakgrunn:

```css
.sp-fag-modal-hero--no-image {
  background: linear-gradient(135deg, var(--sp-primary) 0%, var(--sp-primary-dark) 100%);
}
```

---

## 3. Info-Knapp Bugfix

### Problemet

Info-knapper (i) i blokkskjema-modal responderte ikke pa klikk. Nar bruker klikket pa info-knappen, ble faget valgt istedenfor a apne info-modalen.

### Arsak

Event-handleren for fag-selection fanget klikk-eventet for info-knapp-handleren fikk det:

```javascript
// Fag-selection handler (fanget ALLE klikk pa fag-item)
fagItem.addEventListener('click', (e) => {
  this.handleFagSelection(fag);  // Kjorte for info-handler
});

// Info-knapp handler (fikk aldri klikket)
infoBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  this.showFagModal(fag);
});
```

### Losning

Lagt til early return i fag-selection handler (`studieplanlegger.js`, linje 607-612):

```javascript
// Sjekk om klikket var pa info-knappen
if (e.target.closest('.sp-fag-info-btn')) {
  return;  // La info-knapp-handler ta seg av dette
}
```

### Verifikasjon

1. Apne blokkskjema-modal
2. Klikk pa (i)-knappen for et fag
3. **Forventet:** Info-modal apnes
4. **For fix:** Faget ble valgt, ingen modal

---

## 4. Korte Fagnavn (shortTitle)

### Bakgrunn

UDIR har lange, formelle fagnavn som "Norsk, vg1, studieforberedende utdanningsprogram". I modal-visningen er dette upraktisk.

### Implementasjon

**Nytt felt i frontmatter:**
```yaml
---
title: Norsk, vg1, studieforberedende utdanningsprogram
shortTitle: Norsk VG1
---
```

**Build-script (`scripts/build-api.cjs`):**
```javascript
const shortTitle = frontmatter.shortTitle || null;
// Inkluderes i output
```

**Modal-rendering (`studieplanlegger.js`):**
```javascript
const displayTitle = fag.shortTitle || fag.title;
```

### Fag med shortTitle

| Fag | Originaltittel | shortTitle |
|-----|----------------|------------|
| Norsk VG1 | Norsk, vg1, studieforberedende utdanningsprogram | Norsk VG1 |
| Norsk VG2 | Norsk, vg2, studieforberedende utdanningsprogram | Norsk VG2 |
| Norsk VG3 | Norsk, vg3, studieforberedende utdanningsprogram | Norsk VG3 |
| Engelsk | Engelsk, vg1, studieforberedende utdanningsprogram | Engelsk VG1 |
| Historie | Historie, vg2, studieforberedende utdanningsprogram | Historie VG2 |
| Naturfag | Naturfag, studieforberedende utdanningsprogram | Naturfag |
| Kroppsøving VG1 | Kroppsøving, vg1 | Kroppsøving VG1 |
| Kroppsøving VG2 | Kroppsøving, vg2 | Kroppsøving VG2 |
| Kroppsøving VG3 | Kroppsøving, vg3 | Kroppsøving VG3 |

---

## 5. Fjernet Redundant Tekst

### Duplikat tittel

Beskrivelses-HTML fra UDIR inneholder ofte en h1-tag med tittelen. Dette ble fjernet med regex:

```javascript
// Fjern duplikat h1-tittel fra beskrivelse
beskrivelse = beskrivelse.replace(/<h1[^>]*>.*?<\/h1>/gi, '');
```

### Redundant læreplan-tekst

"Læreplan: Læreplan i..." ble forkortet:

```javascript
// Fjern "Læreplan i" prefiks
laereplan = laereplan.replace(/^Læreplan i\s*/i, '');
```

---

## Filer Modifisert

### Kode
| Fil | Endringer |
|-----|-----------|
| `src/studieplanlegger.js` | renderFagModal(), info-knapp bugfix |
| `scripts/build-api.cjs` | shortTitle, bilde, vimeo felt |
| `styles/components/modal.css` | Hero-seksjon CSS |

### Data (markdown)
- `data/curriculum/markdown/fellesfag/Norsk,_vg1.md`
- `data/curriculum/markdown/fellesfag/Norsk,_vg2.md`
- `data/curriculum/markdown/fellesfag/Norsk,_vg3.md`
- `data/curriculum/markdown/fellesfag/Engelsk.md`
- `data/curriculum/markdown/fellesfag/Historie,_vg2.md`
- `data/curriculum/markdown/fellesfag/Naturfag.md`
- `data/curriculum/markdown/fellesfag/Kroppsøving,_vg1.md`
- `data/curriculum/markdown/fellesfag/Kroppsøving,_vg2.md`
- `data/curriculum/markdown/fellesfag/Kroppsøving,_vg3.md`
- `data/curriculum/markdown/valgfrie-programfag/Fysikk_1.md`

### Nye mapper
- `public/images/fag/` - bildemappe for fagbilder

---

## Testing

### Sjekkliste

- [x] Info-knapp apner modal (ikke velger fag)
- [x] Fag med bilde viser hero med gradient
- [x] Fag uten bilde viser gronn gradient-fallback
- [x] shortTitle vises istedenfor lang tittel
- [x] Ingen duplikat h1 i beskrivelse
- [x] Fordypning-badge vises korrekt

### Test-URL

```
http://localhost:8000/public/demo.html
```

---

## Neste Steg

Se pa blokkskjema og alternativene der. Referanse:
- `docs/ALTERNATIVE-BLOKKSKJEMA-ANALYSE.md` - Analyse av multi-versjon stotte
