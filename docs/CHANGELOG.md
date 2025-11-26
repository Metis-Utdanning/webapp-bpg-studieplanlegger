# Changelog - Studieplanlegger

> Alle viktige endringer i prosjektet dokumenteres her.
> Formatet er basert på [Keep a Changelog](https://keepachangelog.com/no/1.0.0/).

---

## [Unreleased]

### Planlagt arbeid
- Se og analysere blokkskjema-alternativer (ref: `docs/ALTERNATIVE-BLOKKSKJEMA-ANALYSE.md`)

---

## [2025-11-26] - Forbedret katalog-modal med trekkspillmenyer

### Lagt til

#### Trekkspillmenyer for valgfrie programfag
Fag-detaljer modalen viser na 4 trekkspillmenyer for valgfrie programfag:
1. **"Hvordan arbeider man i faget?"** - Ny seksjon med informasjon om arbeidsmetoder
2. **"Fagets relevans"** - Ny seksjon om fagets betydning og bruksomrader
3. **"I dette faget lærer du a ..."** - Eksisterende kompetansemal, na i trekkspill
4. **"Kjerneelementer"** - Eksisterende innhold, na i trekkspill

#### Trekkspillmenyer for fellesfag og obligatoriske programfag
Forenklet visning med 2 trekkspillmenyer:
1. **"I dette faget lærer du a ..."** - Kompetansemal
2. **"Kjerneelementer"** - Kjerneelementer

#### UX-forbedringer
- Alle trekkspillmenyer er lukket som standard for ryddig forsteinntrykk
- Tomme seksjoner viser "Innhold kommer snart" placeholder-tekst
- Full keyboard-stotte med Enter/Space for a apne/lukke
- Responsivt design tilpasset mobilvisning

### Tekniske endringer

#### Build-script (`scripts/build-api.cjs`)
- Ny funksjon `extractSection()` - Ekstraherer navngitte seksjoner fra markdown
- Ny funksjon `extractKjerneelementer()` - Parser kjerneelementer-listen
- API-output inkluderer na `arbeidsmater`, `relevans`, `kompetansemal`, `kjerneelementer`

#### Hovedmodul (`src/studieplanlegger.js`)
- Ny funksjon `isValgfriProgramfag()` - Sjekker fagtype for a bestemme visning
- Ny funksjon `renderAccordion()` - Genererer trekkspill HTML-markup
- Ny funksjon `renderValgfriProgramfagBody()` - Renderer 4-trekkspill layout
- Ny funksjon `renderStandardFagBody()` - Renderer 2-trekkspill layout
- Ny funksjon `setupFagAccordionHandlers()` - Event handlers for trekkspill

#### Styling (`styles/studieplanlegger.css`)
- `.fag-accordions` - Container for trekkspill-gruppe
- `.fag-accordion` - Individuelt trekkspill med header og body
- `.kjerneelement` - Styling for kjerneelement-items
- `.placeholder-text` - Styling for "Innhold kommer snart" tekst

### Endret

#### Innholdsfiler
- Alle 34 valgfrie-programfag markdown-filer oppdatert med nye seksjoner:
  - "Hvordan arbeider man i faget?"
  - "Fagets relevans"
- Innhold hentet fra UDIR lareplaner og tilpasset malgruppa

### Filer endret

**Kode:**
- `scripts/build-api.cjs` - extractSection(), extractKjerneelementer()
- `src/studieplanlegger.js` - Modal rendering og trekkspill-logikk
- `styles/studieplanlegger.css` - Trekkspill CSS

**Data:**
- 34 filer i `data/curriculum/markdown/valgfrie-programfag/` - Nye seksjoner

---

## [2025-11-26] - Bugfixes og UI-komprimering

### Fikset

#### Katalog-modal for fellesfag
- **Problem:** Samfunnskunnskap, Geografi og fremmedsprak apnet ikke katalog-modal ved klikk
- **Arsak:** ID-mismatch mellom `geografi-vg1` (i data) og `geografi` (i showFagDetails)
- **Losning:** Oppdatert showFagDetails() til a handtere begge ID-formater (studieplanlegger.js:1546-1550)

#### Forutsetning-validering for "bygger pa"-fag
- **Problem:** Fag som Kjemi 2, Fysikk 2, R2 kunne velges uten at forutsetningsfaget var valgt
- **Arsak:** updateBlokkValidation() brukte `dataset.fagkode` istedenfor `dataset.id`
- **Losning:** Endret til `dataset.id` for korrekt matching mot forutsetninger (studieplanlegger.js:1048, 1207)

#### Print-layout forbedret
- **Problem:** Studieplan passet ikke pa en A4-side ved utskrift
- **Losning:**
  - Endret til liggende A4-format (landscape)
  - Smale marger (8mm)
  - Komprimerte fontstorrelser og padding
  - Alt innhold far na plass pa en side (print.css)

#### Bildestier oppdatert
- Lagt til `bilde` felt i frontmatter for 15 programfag som manglet det:
  - Engelsk, Kjemi 1, Kjemi 2, Psykologi 1, Psykologi 2
  - Matematikk R1, R2, S1, S2
  - Fysikk 2, Biologi 1, Biologi 2
  - Rettslare 1, Rettslare 2
  - Og flere

### Endret

#### UI-komprimering
- **Kompakte fag-bokser:** Redusert hoyde pa fag-items i hovedvisning (padding: 4px 10px, margin-bottom: 2px)
- **Fjernet timetall fra headers:** VG1/VG2/VG3 headers viser ikke lenger "842 timer" osv.
- **Kompakt header:** Redusert header-hoyde (min-height: 36px, font-size: 1.1rem)
- **Mindre whitespace:** Redusert margin mellom fag-kategorier (spacing-sm)

### Filer endret

**Kode:**
- `src/studieplanlegger.js` - showFagDetails(), updateBlokkValidation()
- `styles/print.css` - Liggende A4-format, komprimert layout

**Data (markdown frontmatter):**
- Diverse programfag i `data/curriculum/markdown/valgfrie-programfag/` - bilde-felt

---

## [2024-11-25] - Katalog-modal redesign

### Lagt til

#### Bildesystem for fag
- Ny mappe `/public/images/fag/` for fagbilder
- Stotte for `bilde` felt i markdown-frontmatter
- Stotte for `vimeo` felt for video-innhold (fremtidig bruk)
- Build-script (`scripts/build-api.cjs`) oppdatert til a inkludere bilde/vimeo i API-output
- Eksempel: Fysikk 1 har bilde pa `/public/images/fag/fysikk-1.jpg`

#### Korte fagnavn (shortTitle)
- Nytt `shortTitle` felt i build-api.cjs og markdown-frontmatter
- Brukes for fag med lange UDIR-titler i modal-visning
- Implementert for folgende fellesfag:
  - Norsk VG1, VG2, VG3
  - Engelsk VG1
  - Historie VG2
  - Naturfag
  - Kroppsøving VG1, VG2, VG3

#### Hero-design for fag-modal
- Ny hero-seksjon med bilde og gradient overlay
- Tittel og fagkode vises over bildet med mork gradient for lesbarhet
- Fallback med gronn gradient for fag uten bilde
- Fordypning-badge og fagkode-badge pa samme linje under tittel

### Endret

#### Modal-rendering
- `renderFagModal()` i `studieplanlegger.js` bruker na `fag.shortTitle || fag.title`
- Fjernet duplikat tittel (h1) fra beskrivelseHTML via regex
- Fjernet "Læreplan: Læreplan i..." redundant tekst fra visning

### Fikset

#### Info-knapp bugfix
- **Problem:** Info-knapper i blokkskjema-modal responderte ikke pa klikk
- **Arsak:** Fag-selection handler fanget klikk for info-handler fikk dem
- **Losning:** Lagt til early return i `studieplanlegger.js` (linje 607-612):
```javascript
if (e.target.closest('.sp-fag-info-btn')) {
  return;
}
```

### Filer endret

**Kode:**
- `src/studieplanlegger.js` - renderFagModal(), info-knapp bugfix
- `scripts/build-api.cjs` - shortTitle, bilde, vimeo felt
- `styles/components/modal.css` - Hero-seksjon CSS

**Data (markdown frontmatter):**
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

**Nye mapper:**
- `public/images/fag/` - bildemappe for fagbilder

---

## [2024-11-24] - Kritiske bugs og WCAG tilgjengelighet

> Commit: f7243d0

### Fikset
- Kritiske bugs i fag-valg og lagring
- Forbedret robusthet i state-handtering
- WCAG AA tilgjengelighet forbedret

---

## [2024-11-23] - Embed og GitHub Pages

> Commit: 3c4fb60

### Lagt til
- `dist/` lagt til git for GitHub Pages hosting
- Oppdatert embed-kode for jsDelivr CDN

---

## [2024-11-22] - Dokumentasjon og styling

> Commit: c500740

### Endret
- Dokumentasjon opprydding
- Embed-kode forbedringer
- Kompakt styling

---

## Versjonering

Dette prosjektet bruker datobasert versjonering (YYYY-MM-DD) da det er en intern applikasjon uten semantisk versjonering.

## Lenker

- [GitHub Repository](https://github.com/fredeids-metis/studieplanlegger)
- [CLAUDE.md](../CLAUDE.md) - Prosjektkontekst
- [Alternative blokkskjema analyse](./ALTERNATIVE-BLOKKSKJEMA-ANALYSE.md)
- [PDF-eksport analyse](./PDF-EKSPORT-ANALYSE.md)
