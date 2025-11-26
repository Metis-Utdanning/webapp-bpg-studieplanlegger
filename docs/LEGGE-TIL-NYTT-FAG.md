# Guide: Legge til nytt fag i Studieplanlegger

> **Sist oppdatert:** 2025-11-26

Denne guiden beskriver steg-for-steg hvordan du legger til et helt nytt fag som ikke eksisterer i systemet fra før.

---

## Oversikt: 4 filer + 1 bilde

| # | Fil | Beskrivelse |
|---|-----|-------------|
| 1 | `data/curriculum/markdown/valgfrie-programfag/[Navn].md` | Fagbeskrivelse med frontmatter |
| 2 | `data/curriculum/regler.yml` | Fagområde, forutsetninger, eksklusjoner |
| 3 | `data/schools/bergen-private-gymnas/blokkskjema_*.yml` | Plassering i blokk |
| 4 | `public/images/fag/[id].jpg` | Illustrativt bilde |

**Alt annet er automatisk** - build-script, data-handler og validation-service trenger ingen endringer.

---

## Steg 1: Opprett fagbeskrivelse (Markdown)

**Filsti:** `data/curriculum/markdown/valgfrie-programfag/[Fagnavn].md`

### Frontmatter (obligatorisk)

```yaml
---
id: matematikk-r3              # Unik ID (kebab-case, ingen æøå)
title: Matematikk R3           # Fullt visningsnavn
fagkode: REA3057               # UDIR fagkode
lareplan: MAT03-02             # UDIR læreplan-kode
bilde: /public/images/fag/matematikk-r3.jpg
vimeo: ""                      # Vimeo video ID (valgfritt)
generert: 2025-11-26
---
```

### Frontmatter (valgfritt)

```yaml
shortTitle: "R3"               # Kort visningsnavn for modal
type: programfag               # eller "fellesfag"
trinn: vg3                     # Hvis kun tilgjengelig ett trinn
```

### 6 obligatoriske seksjoner

```markdown
# [Fagnavn]

**Læreplan:** [Læreplan-tittel fra UDIR]

## Om faget
[2-3 avsnitt om fagets innhold]

## Hvordan arbeider man i faget
[2-3 avsnitt om undervisningsmetoder]

## Fagets relevans
[2-3 avsnitt om relevans og videre utdanning]

## Kompetansemål
- [Punkt 1]
- [Punkt 2]
- ...

## Kjerneelementer

### [Kjerneelement 1]
[Beskrivelse]

### [Kjerneelement 2]
[Beskrivelse]

## Ressurser
<!-- Vimeo-lenke legges inn her når klar -->
```

---

## Steg 2: Oppdater regler (regler.yml)

**Filsti:** `data/curriculum/regler.yml`

### A) Legg til i fagområde

Finn riktig fagområde og legg til fag-ID:

```yaml
fagomrader:
  MAT:
    navn: "Matematikk"
    fag:
      - matematikk-r1
      - matematikk-r2
      - matematikk-r3      # <-- LEGG TIL HER
      - matematikk-s1
      - matematikk-s2
```

### B) Legg til forutsetning (hvis faget bygger på et annet)

```yaml
forutsetninger:
  - fag: matematikk-r3
    krever: [matematikk-r2]
    type: blocking
    beskrivelse: "Matematikk R3 bygger på Matematikk R2"
    feilmelding: "Matematikk R3 krever at du har hatt R2 først"
    forslag: "Legg til Matematikk R2"
```

### C) Legg til eksklusjon (hvis faget ikke kan kombineres med andre)

```yaml
eksklusjoner:
  - id: math-r3-s3-conflict
    type: blocking
    konfliktGrupper:
      - [matematikk-r3]
      - [matematikk-s3]
    beskrivelse: "R3 og S3 kan ikke kombineres"
    feilmelding: "Du kan ikke kombinere Matematikk R3 og S3"
```

---

## Steg 3: Legg til i blokkskjema

**Filsti:** `data/schools/bergen-private-gymnas/blokkskjema_v2.yml` (eller annen versjon)

Finn riktig blokk og legg til faget:

```yaml
blokker:
  blokk1:
    navn: "Blokk 1"
    fag:
      # ... andre fag ...

      - id: matematikk-r3
        timer: 140
        trinn: vg3
        tilgjengeligFor: ["studiespesialisering"]
        krever: ["matematikk-r2"]
        merknad: "Fordypning i realfag"
```

### Timer-standarder

| Fagtype | Timer |
|---------|-------|
| Valgfrie programfag | 140 |
| Historie (obligatorisk VG3) | 113 |
| Matematikk 2P (fellesfag) | 84 |

### Programkoder

- `studiespesialisering`
- `musikk-dans-drama`
- `medier-kommunikasjon`

---

## Steg 4: Legg til bilde

**Filsti:** `public/images/fag/[id].jpg`

- Filnavn må matche fag-ID (kebab-case)
- Format: JPG
- Størrelse: ~800x600 eller større
- Innhold: Illustrativt bilde som representerer faget

---

## Steg 5: Build og test

```bash
# Regenerer API
npm run build

# Start lokal server
npm run dev

# Åpne i nettleser
open http://localhost:8000/public/demo.html
```

Test at:
- Faget vises i riktig blokk
- Fagbeskrivelse vises i modal/katalog
- Forutsetninger valideres korrekt
- Eksklusjoner fungerer

---

## Steg 6: Commit og deploy

```bash
git add data/ public/
git commit -m "Feature: Legg til [Fagnavn]"
git push
```

---

## Eksempel: Legge til Matematikk R3 og S3

Hvis UDIR foreslår to nye matematikkfag:

| Felt | R3 | S3 |
|------|----|----|
| id | `matematikk-r3` | `matematikk-s3` |
| Krever | `matematikk-r2` | `matematikk-s2` |
| Eksklusjon | Kan ikke kombineres med S3 | Kan ikke kombineres med R3 |
| Trinn | VG3 | VG3 |
| Timer | 140 | 140 |
| Blokk | Blokk 1 | Blokk 1 |
| Fagområde | MAT | MAT |

### Filer som må opprettes/oppdateres:

1. `data/curriculum/markdown/valgfrie-programfag/Matematikk_R3.md`
2. `data/curriculum/markdown/valgfrie-programfag/Matematikk_S3.md`
3. `data/curriculum/regler.yml` (fagområde + forutsetninger + eksklusjoner)
4. `data/schools/bergen-private-gymnas/blokkskjema_v2.yml`
5. `public/images/fag/matematikk-r3.jpg`
6. `public/images/fag/matematikk-s3.jpg`

---

## Datakilde: UDIR GREP API

Fagbeskrivelser og kompetansemål kan hentes fra UDIR:

- **API:** https://data.udir.no/kl06/v201906
- **Hent data:** `npm run fetch:all`

---

## Fag som BYGGER PÅ andre fag

Fra `regler.yml` - disse krever forutsetning:

| Fag | Krever |
|-----|--------|
| Fysikk 2 | Fysikk 1 |
| Kjemi 2 | Kjemi 1 |
| Matematikk R2 | Matematikk R1 |
| Matematikk S2 | Matematikk S1 |
| Engelsk 2 | Engelsk 1 |
| Historie og filosofi 2 | Historie og filosofi 1 |
| Markedsføring og ledelse 2 | Markedsføring og ledelse 1 |
| Samfunnsøkonomi 2 | Samfunnsøkonomi 1 |

## Fag som IKKE bygger på andre

Disse kan velges uavhengig av trinn:

- Biologi 1 og 2
- Psykologi 1 og 2
- Rettslære 1 og 2
- Entreprenørskap 1 og 2
- Musikk fordypning 1 og 2
- Geofag 1 og 2
- Informasjonsteknologi 1 og 2
- Teknologi og forskningslære 1 og 2

---

## Systemflyt (for utviklere)

```
Markdown + Frontmatter
    └─> build-api.cjs
        └─> studieplanlegger.json (API)
            └─> data-handler.js
                └─> state.js
                    └─> validation-service.js
                        └─> UI (modal, katalog, etc.)
```

Alt fra `data-handler.js` og nedover er automatisk - du trenger kun oppdatere kildedataene.
