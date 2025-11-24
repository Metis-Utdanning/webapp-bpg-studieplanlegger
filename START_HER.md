# 🚀 START HER - Neste sesjon

**Dato siste arbeid:** 2024-11-24
**Status:** Klar for implementering av ny fordypningslogikk

---

## 📍 Hvor er vi nå?

### ✅ Fullført:
1. **Monorepo setup** - Alt samlet i ett repo
2. **Fase 0: Bugfixes** - Fikset alle akutte bugs (data-mock, API URL, modal innhold, historie data-attributter)
3. **Fase 1: Commit bugfixes** - Committed (c488076, 8ef4502)
4. **Fase 2: Refaktorering** - Fjernet hardcoded fallback, fikset fordypningsberegning til fagområde
5. **VALIDERINGSPLAN.md** - Helhetlig plan (7000+ ord) med datamodell, arkitektur, regler, testcases
6. **Fått svar fra bruker** - Alle kritiske spørsmål besvart

### 🔄 Neste:
1. Implementer ny fordypningslogikk (2 fag med samme læreplankode = 1 fordypning)
2. Fjern console-advarsler for fellesfag
3. Lag automatiserte valideringstester
4. Test alle 10 testcases
5. Deploy til GitHub Pages

---

## 🎯 Kritisk innsikt: FORDYPNING og FORUTSETNINGER

**VIKTIG ENDRING:**

### ❌ GAMMEL (feil) forståelse:
- Fordypning = 560 timer totalt fra 2+ fagområder (280t per område)
- Teller timer og fagområder
- Alle nivå 2-fag bygger på nivå 1

### ✅ NY (korrekt) forståelse:
- **Fordypning = 2 fag fra SAMME fagområde** (definert i UDIR Tabell 5 og 6)
- **Krav: 2 fordypninger totalt over VG2+VG3**
- **Fagområde ≠ Læreplankode** (fagområde er gruppering fra UDIR-tabellene)
- **Kun noen nivå 2-fag bygger på nivå 1** (kun de med eksplisitt "(bygger på X)" i UDIR-tabellene)

**Eksempel - Fordypning:**
```
VG2:
- Matematikk R1 (fagområde: Matematikk)
- Fysikk 1 (fagområde: Fysikk)
- Psykologi 1 (fagområde: Psykologi)
- Biologi 1 (fagområde: Biologi)

VG3:
- Matematikk R2 (fagområde: Matematikk)  ← SAMME fagområde som R1
- Fysikk 2 (fagområde: Fysikk)           ← SAMME fagområde som Fysikk 1
- Psykologi 2 (fagområde: Psykologi)     ← SAMME fagområde som Psykologi 1

RESULTAT:
✅ 3 fordypninger: Matematikk, Fysikk, Psykologi
✅ Oppfyller kravet (minst 2 fordypninger)
```

**Eksempel - Forutsetninger:**
```
✅ Fysikk 2 bygger på Fysikk 1 (står i UDIR-tabell)
✅ Kjemi 2 bygger på Kjemi 1 (står i UDIR-tabell)
❌ Biologi 2 bygger IKKE på Biologi 1 (står IKKE i UDIR-tabell) - kan tas i hvilken som helst rekkefølge!
❌ Psykologi 2 bygger IKKE på Psykologi 1 - kan tas parallelt eller i feil rekkefølge!
```

---

## 📝 Andre viktige beslutninger

### 1. Spansk I+II i VG3
**Beslutning:** Tvinge inn i 4 fag  
**Konsekvens:** Hvis harFremmedsprak = false → Spansk I+II må være ett av de 4 fagene i VG3

### 2. Historie VG3
**Beslutning:** Teller mot 4 fag  
**Forklaring:** Egentlig bare 3 programfag, men Historie legges til som fjerde fag for praktiske årsaker (likt antall i VG2 og VG3)

### 3. Matematikk 2P
**Beslutning:** Teller IKKE mot fordypning  
**Forklaring:** Er fellesfag, ikke programfag. Kan ikke brukes i fordypningsberegning.

### 4. Console-advarsler
**Beslutning:** Fjerne advarsler for fellesfag  
**Konsekvens:** Kun vise advarsler for programfag som mangler fagområde

---

## 🛠️ Hva skal gjøres nå?

### Steg 1: Implementer ny fordypningslogikk

**Fil:** `src/core/validation-service.js` (linje 682-770)

**NY logikk (må implementeres):**
```javascript
// FORDYPNING CALCULATION (VG2 + VG3 combined)
// Requirement: 2 fordypninger (2 fag med samme læreplankode)

const lareplanMap = {}; // Group by læreplankode

allSelections.forEach(fag => {
  // Skip fellesfag (except matematikk programfag)
  if (fag.type === 'fellesfag' && fag.slot !== 'matematikk') return;

  // Skip excluded fag
  if (excludedFromFordypning.includes(fagId)) return;

  const lareplan = fag.lareplan; // e.g., "MAT03-02", "FYS01-01"

  if (!lareplanMap[lareplan]) {
    lareplanMap[lareplan] = { fag: [], timer: 0 };
  }

  lareplanMap[lareplan].fag.push(fag.navn);
  lareplanMap[lareplan].timer += timer;
});

// Count fordypninger (læreplans with 2+ fag)
let fordypninger = 0;

Object.entries(lareplanMap).forEach(([lareplan, data]) => {
  if (data.fag.length >= 2) {
    fordypninger++;
  }
});

// Check if fordypning requirement is met
const fordypningMet = fordypninger >= 2;
```

### Steg 2: Fjern console-advarsler for fellesfag

**Fil:** `src/core/validation-service.js` (linje 710-712)

**Endre til:**
```javascript
if (!fagomrade) {
  // Skip warning for fellesfag (e.g., historie-vg3)
  if (fag.type === 'fellesfag') {
    return; // Silent skip
  }
  console.warn(`⚠️ Fag ${fagId} (${fag.navn}) mangler fagområde`);
  return;
}
```

### Steg 3: Oppdater UI for fordypningsvisning

**NY visning:**
```
Fordypning: 3 fordypninger (trenger minst 2)
✅ Matematikk (MAT03-02): Matematikk R1, Matematikk R2 (280t)
✅ Fysikk (FYS01-01): Fysikk 1, Fysikk 2 (280t)
✅ Kjemi (KJE01-01): Kjemi 1, Kjemi 2 (280t)
```

---

## 📚 Viktige filer

### Dokumentasjon:
- `VALIDERINGSPLAN.md` - Helhetlig plan (LES DENNE!)
- `CLAUDE.md` - Prosjektinstruksjoner
- `til_claude.md` - Viktige beslutninger

### Datakilder:
- `data/curriculum/regler.yml` - UDIR-regler
- `data/schools/bergen-private-gymnas/blokkskjema_v2.yml` - BPG blokkskjema
- `data/schools/bergen-private-gymnas/timefordeling.yml` - Fellesfag

### Kode:
- `src/core/validation-service.js` - Valideringslogikk (ENDRE HER!)
- `src/studieplanlegger.js` - Hovedfil
- `src/ui/ui-renderer.js` - UI-rendering

---

## 🧪 Testcases (fra VALIDERINGSPLAN.md)

### Test 1: Studiespesialisering - Realfag (GYLDIG)
**VG2:** R1, Fysikk 1, Kjemi 1, Biologi 1  
**VG3:** R2, Fysikk 2, Kjemi 2  
**Forventet:** ✅ 3 fordypninger (MAT, FYS, KJE)

### Test 5: For lite fordypning (UGYLDIG)
**VG2:** R1, Fysikk 1, Samfunnsøkonomi 1, Psykologi 1  
**VG3:** R2, Økonomi og ledelse, Bilde  
**Forventet:** ❌ Kun 1 fordypning (trenger 2)

Se VALIDERINGSPLAN.md for alle 10 testcases!

---

## 🎯 Neste gang du starter:

### Si til Claude:
**"Claude, lets go!"**

### Claude vil da:
1. Lese denne filen (START_HER.md)
2. Oppsummere hvor vi er
3. Spørre: "Skal jeg implementere ny fordypningslogikk nå?"
4. Implementere Steg 1-3 ovenfor
5. Teste med de 10 testcasene
6. Commit + push

---

## 📌 Quick commands:

```bash
# Start dev server (hvis ikke allerede startet)
npm run dev
# → http://localhost:8000/public/demo.html

# Rebuild API (hvis du endrer YAML-filer)
npm run build

# Commit changes
git add .
git commit -m "Melding"
git push
```

---

**🎉 Du er klar til å fortsette! Si "Claude, lets go!" når du er klar.**
