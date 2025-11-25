# Blokkskjema-guide

> Hvordan legge til, endre og administrere blokkskjema-versjoner

---

## Filstruktur

```
data/schools/bergen-private-gymnas/
    school-config.yml        # Versjonsstyring (hvilken versjon er aktiv)
    blokkskjema_v2.yml       # Hovedversjon
    blokkskjema_test.yml     # Test-versjon
```

---

## 1. Legge til ny blokkskjema-versjon

**Steg 1:** Kopier eksisterende fil som mal

```bash
cp data/schools/bergen-private-gymnas/blokkskjema_v2.yml \
   data/schools/bergen-private-gymnas/blokkskjema_v3.yml
```

**Steg 2:** Rediger `school-config.yml` - legg til ny versjon under `versions`:

```yaml
blokkskjema:
  activeVersion: "v2"  # Behold eksisterende som aktiv
  versions:
    v2: "blokkskjema_v2.yml"
    test: "blokkskjema_test.yml"
    v3: "blokkskjema_v3.yml"       # NY LINJE
```

**Steg 3:** Rebuild og test

```bash
npm run build
npm run dev
```

---

## 2. Endre eksisterende blokkskjema

### Legge til fag i en blokk

Finn riktig blokk (f.eks. `blokk1`) og legg til under `fag:`

```yaml
blokker:
  blokk1:
    fag:
      # Eksisterende fag...

      # NYTT FAG:
      - id: geografi           # Fag-ID (fra data/curriculum/markdown/)
        timer: 140             # Timetall
        trinn: vg2             # vg2 eller vg3
        tilgjengeligFor:       # Hvilke programmer kan velge dette
          - studiespesialisering
          - musikk-dans-drama
          - medier-kommunikasjon
```

### Fjerne fag

Slett hele fag-blokken (fra `- id:` til neste `- id:` eller slutten av listen).

### Fag med forutsetninger

```yaml
- id: fysikk-2
  timer: 140
  trinn: vg3
  tilgjengeligFor: ["studiespesialisering"]
  krever: ["fysikk-1"]                        # Obligatorisk forutsetning
  anbefaltForutsetning: ["matematikk-r1"]     # Valgfri anbefaling
```

### Obligatoriske fag

```yaml
- id: historie-vg3
  timer: 113
  trinn: vg3
  tilgjengeligFor: ["studiespesialisering", "musikk-dans-drama", "medier-kommunikasjon"]
  obligatorisk: true
```

---

## 3. Bytte aktiv versjon

Rediger `school-config.yml`:

```yaml
blokkskjema:
  activeVersion: "v3"    # Endre fra "v2" til "v3"
```

Deretter rebuild:

```bash
npm run build
```

---

## 4. Teste endringer lokalt

```bash
# 1. Start dev-server
npm run dev

# 2. Apne i nettleser
open http://localhost:8000/public/demo.html
```

Test-sjekkliste:
- [ ] Fag vises i riktig blokk
- [ ] Fag er tilgjengelig for riktige programmer
- [ ] Forutsetninger fungerer (f.eks. Fysikk 2 krever Fysikk 1)
- [ ] Timer vises korrekt

---

## Quick Reference

| Oppgave | Kommando/Fil |
|---------|--------------|
| Rebuild API | `npm run build` |
| Start dev-server | `npm run dev` |
| Endre aktiv versjon | `school-config.yml` -> `activeVersion` |
| Legge til versjon | `school-config.yml` -> `versions` |
| Redigere fag | `blokkskjema_*.yml` -> `blokker` -> `blokk#` -> `fag` |

---

## YAML-struktur: Komplett fag-eksempel

```yaml
- id: kjemi-1                    # Unik ID (matcher markdown-fil)
  fagkode: KJE1001               # Valgfri: offisiell fagkode
  timer: 140                     # Timetall
  trinn: vg2                     # vg2 eller vg3
  tilgjengeligFor:               # Liste over programmer
    - studiespesialisering
    - musikk-dans-drama
  krever: []                     # Obligatoriske forutsetninger
  anbefaltForutsetning: []       # Valgfrie anbefalinger
  obligatorisk: false            # true hvis faget er obligatorisk
  betingetObligatorisk: false    # true hvis betinget (f.eks. Spansk I+II)
  merknad: "Valgfri kommentar"   # Vises ikke i UI, kun dokumentasjon
```

---

## Vanlige feil

| Problem | Losning |
|---------|---------|
| Fag vises ikke | Sjekk at `tilgjengeligFor` inkluderer riktig program |
| Fag vises i feil trinn | Sjekk `trinn: vg2` eller `trinn: vg3` |
| Build feiler | Sjekk YAML-syntaks (innrykk, kolon, bindestreker) |
| Versjon ikke tilgjengelig | Legg til i `school-config.yml` under `versions` |
