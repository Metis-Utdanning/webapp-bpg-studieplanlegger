# Changelog - Studieplanlegger

> Alle viktige endringer i prosjektet dokumenteres her.
> Formatet er basert på [Keep a Changelog](https://keepachangelog.com/no/1.0.0/).

---

## [Unreleased]

### Planlagt arbeid
- Se og analysere blokkskjema-alternativer (ref: `docs/ALTERNATIVE-BLOKKSKJEMA-ANALYSE.md`)

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
