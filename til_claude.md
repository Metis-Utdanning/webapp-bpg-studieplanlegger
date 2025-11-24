# til_claude.md - Studieplanlegger

## Prosjektinfo

**Repo:** https://github.com/fredeids-metis/studieplanlegger
**Bruker:** fredeids-metis.no
**Skole:** Bergen Private Gymnas

---

## Formål og Brukere

### Hvem skal bruke appen?

**Elever** skal bruke appen for å få 100% kontroll over studieløpet sitt.

**Jeg** (som rådgiver og studieleder) skal sørge for at elevene får korrekt informasjon om studieløpet og tar gode informerte valg.

### Hva skal elevene kunne gjøre?

A) **Planlegge** hvilke programfag de skal velge et gitt skoleår
B) **Få oversikt** over HELE studiet sitt, inkludert fordypning, slik at de kan ta bevisste valg og sikre at de får vitnemål

---

## Viktig Beslutning: Programområdet Studiespesialisering

Selv om programområdet formelt sett er delt inn i "Realfag" (STREA2----/STREA3----) og "Språk, samfunnsfag og økonomi" (STSSA2----/STSSA3----), så ønsker jeg å **IGNORERE** dette og ta utgangspunkt i at programområdet "Studiespesialisering" er **ÉTT programområde**.

**Begrunnelse:** Det er foreslått å slå sammen disse programområdene til ett fra neste år (kilde: UDIR). 


---

## Data og Kilder

Jeg ønsker lett tilgang til all masterdata og mulighet til å gjøre endringer i vesentlige komponenter.

### Masterdata: Faginformasjon fra UDIR

Alle fag hentes fra UDIR sine masterdata-lister:

- **Fellesfag:** [data/curriculum/master-lists/fellesfag_lk20.txt](data/curriculum/master-lists/fellesfag_lk20.txt)
- **Obligatoriske programfag:** [data/curriculum/master-lists/obligatoriske-programfag_lk20.txt](data/curriculum/master-lists/obligatoriske-programfag_lk20.txt)
- **Valgfrie programfag:** [data/curriculum/master-lists/valgfrie-programfag_lk20.txt](data/curriculum/master-lists/valgfrie-programfag_lk20.txt)

### Eksterne Regler fra UDIR

**Fag- og timefordeling:**
- Kilde: https://www.udir.no/regelverkstolkninger/opplaring/Innhold-i-opplaringen/udir-1-2025/
- Lokal fil: [data/schools/bergen-private-gymnas/timefordeling.yml](data/schools/bergen-private-gymnas/timefordeling.yml)

**Overordnede regler for vitnemål:**
- Kilde: https://www.udir.no/eksamen-og-prover/dokumentasjon/vitnemal-og-kompetansebevis/foring-vitnemal-kompetansebevis-vgs-25/
- Lokal fil: [data/curriculum/regler.yml](data/curriculum/regler.yml)

### Skolespesifikke Komponenter

**Blokkskjema**

En kritisk puslebrikke for timeplanlegging. Strukturert slik at programfag (og enkelte fellesfag) fordeles i "Blokker" som har undervisning parallelt. Dette er et grep skolen gjør for å sikre enklere timeplanlegging.

I praksis fungerer det slik at alle fag i samme blokk undervises parallelt/samtidig. Derfor er blokkskjema kritisk for en studieplanlegger – skolens blokkskjema avgjør hvilke fagkombinasjoner en elev i praksis kan velge.

**Viktig om blokkskjema:**
- Kan endres fra år til år og underveis i året
- MÅ være dynamisk og kunne endres
- Eksempler på endringer:
  - Et fag kan ikke lenger tilbys og må fjernes fra skjema
  - Skolen opplever interesse for nytt fag eller ny fagkombinasjon og bestemmer å flytte et fag fra en blokk til en annen

**Andre skolespesifikke data:**
- Fagtilbud: Hvilke programfag som tilbys og selve faginformasjonen
- Hvilke programområder skolen tilbyr


---

## Krav til Validering

**Hovedkrav:** MINST MULIG hardkoding av regler

Trenger en god arkitektur for en valideringskontroll som kan sjekke:

### A) Blokk-interne regler

Eksempler:
- Ikke samme fag i 2 ulike blokker
- Ikke Matematikk 2P sammen med Matematikk R1

### B) Regler for totalen

Eksempler:
- Ikke ha samme fag i VG2 og i VG3
- Krav til fordypning (2+2 fag)
- Må ha Spansk I+II hvis man ikke hadde fremmedspråk på ungdomsskolen

---

## Arbeidsprosess og Preferanser

Dette systemet skal sikre at Claude husker mine preferanser for arbeidsprosessen.

### Utviklingsmiljø
- Standard system for testing på live server for å unngå krøll med porter
- Ikke sette opp nye live servere hele tiden

### Prosjektstruktur
- **Ryddig prosjektmappe:** Skole-data MÅ være lett tilgjengelig og strukturert slik at endringer RASKT kan gjenspeiles i ferdig produkt
- **Samle TODO:** Mest mulig i ÉN fil øverst i prosjektmappen
- **Samle CONTEXT:** CONTEXT.md-filer og arbeidsdokumenter i en undermappe
- **Minimal rot:** Færrest mulig lokale demo-filer som blir liggende etter bruk (forvirrer meg/Claude)

### Kommunikasjon
- Jeg er ikke utvikler
- Ønsker **korte/konsise forklaringer** på HVORFOR man gjør ting når det skal tas større valg
- Jeg ønsker å teste selv

### Oppgaveadministrasjon
- ÉN, ENKEL todo-fil med "Bugs" og "Feature requests"
- Minst mulig clutter
- Arkiv nederst er valgfritt (endringer som beholdes comittes og pushes uansett) 

# Om Historiefaget i blokkskjema
- Skal være i blokkskjema for alle programområder i VG3
- Skal ikke telles som valgfritt programfag, men utenom
- Hensikten med å ha Historie i blokkskjema er praktiske årsaker, og for å få et "LIKT" tall på programområdet for studiespesialisering: Da velger elever 4 fag i VG2 (3 programfag + 1 matematikkfag) og 4 fag i VG3 (3 valgfrie programfag + 1 Historie) - Dette er "SLOTS" som handler om praktisk timeplanlegging og ikke validering. 
- I VG3 blokkskjema MÅ man velge Historie som 1 av 4 fag for VG3 studiespesialiserende, 1 av 3 fag for Medier og 1 av 2 fag for Musikk. Dette skal stemme overens med TIMEFORDELING.md
- Historie Må velges i blokkskjema, men i den rekkefølgen man ønsker. 
- Historie skal Gråes ut når valgt, men man kan bytte/endre valg. Som i andre tilfeller skal blokk-interne valg nulle hverandre ut. Hvsi man allerede har valgt et fag i en blokk, og velger et nytt i samme blokk ENDRER man valget. 