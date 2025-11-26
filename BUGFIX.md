# Arbeidsdokument for bugfix, feilsøking og feature-requests
Bugs som rapporteres her er basert på versjon som ligger på github, bygget inn på https://www.bergenprivategymnas.no/planlegger med følgende kode: 

  <!-- CSS -->
  <link rel="stylesheet" href="https://fredeids-metis.github.io/studieplanlegger/styles/base.css">
  <link rel="stylesheet" href="https://fredeids-metis.github.io/studieplanlegger/styles/brand.css">
  <link rel="stylesheet" href="https://fredeids-metis.github.io/studieplanlegger/styles/components/modal.css">
  <link rel="stylesheet" href="https://fredeids-metis.github.io/studieplanlegger/styles/studieplanlegger.css">

  <!-- Container -->
  <div id="studieplanlegger"></div>

  <!-- JavaScript -->
  <script type="module">
    import { Studieplanlegger } from 'https://fredeids-metis.github.io/studieplanlegger/src/studieplanlegger.js';

    const app = new Studieplanlegger(
      document.getElementById('studieplanlegger'),
      {
        schoolId: 'bergen-private-gymnas',
        apiBaseUrl: 'https://fredeids-metis.github.io/studieplanlegger/dist/api/v2',
        apiVersion: 'v2'
      }
    );
  </script>

## Bugfix 26.11.2025
- Samfunnskunnskap, Geografi og fremmedspråk trigger ikke katalog-modal ved trykk. Sjekke om innhold finnes, er koblet til korrekte fagkoder. sørge for å få dette til å virke tilsvarende andre fag.
- FIKSET: Ved alle programområder: Får valgt Fag på nivå 2 som "BYGGER PÅ". Det skal IKKE være mulig å velge eksempelvis KJEMI 2 dersom man ikke eksplisitt har trykket, valgt og lagt til Kjemi 1 først. Dette er i motsetning til fag som IKKE bygger på, eksempelvis Biologi 1 og Biologi 2 - Disse kan tas uavhengig av hverandre. Dette SKAL være tydlelig markert i kildematerialet / curriculum: Hvis ikke må vi kontrollere dette på nytt.
- FIKSET: Det er mulig å velge noen fag selv om det skal være tydelig markerte "BYGGER PÅ" i KILDEMATERIALET /data/. Eksempler: Kan velge R2 uten R1. Kan velge Kjemi 2 uten Kjemi 1. Kan velge markedsføring og ledelse 2 uten 1. Kan se ut som at det gjelder ALLE fag som "BYGGER PÅ", så her må vi gå gjennom logikken. Ønsket utfall: Fag som "BYGGER PÅ", skal være GRÅET UT i vg3-modal dersom de IKKE er valgt i VG2-modal.
  - Root cause: studieplanlegger.js brukte dataset.fagkode (e.g., 'KJE1002') istedenfor dataset.id (e.g., 'kjemi-2') i validering
  - Løsning: Endret linje 1048 og 1207 i studieplanlegger.js til å bruke dataset.id
  - Alle forutsetninger i regler.yml er korrekt definert som type: blocking 
- Funksjonen "Skriv ut studieplan": Per nå er det vilkårlig om innholdet havner på 1 side eller om det spres i et virr-varr av sider. Ønsker at default skal være "liggende format", smale marger, og ALT innhold på SAMME side. 
- BILDER: Skal være lastet opp en rekke bilder nå, men ikke alle vises i live-versjonen via github pages. Kan vi ta en full gjennomgang av bilder og sørge for at alle er korrekt lastet opp?

##  UI-forbedringer
- Lage lavere høyde i boksene som indikerer fag i hovedvisning (MÅL: se flere i høyden fag på laptop)
- Lage lavere høyde i boksene som indikerer fag, innad i blokkene i blokkskjema-modal (MÅL: se flere i høyden fag på laptop)
- Fjerne "TIMETALL" under henholdsvis VG1/VG2/VG3 i hovedoversikten; dette er for det første feil på programområdedene MUSIKK / MEDIER, og det er irrelevant. Dette betyr igjen at header-boksen som indikerer trinn kan lages noe "lavere" for å spare plass vertikalt. 
- Lage LITT mindre whitespace mellom "Matematikk (Klikk for å velge)" og "Programfag (Klikk for å velge)", samt tilsvarende mellom "Historie (velges i blokkskejam)" og "Programfag (klikk for å velge)". 

##  Features
- 



 Hei Claude. Jeg vil jobbe videre med studieplanleggeren min (denne prosjektmappen). Jeg har et dokument; /Users/fredrik/Documents/studieplanlegger/BUGFIX.md
  som jeg har skrevet ned bugs, feature-requests og andre tanker om prosjektet som jeg ønsker å bruke som utgangspunkt for videre planlegging. Les og forstå
  HELE prosjektmappen, bruk eventuelt flere agenter ved behov. Lag et forslag til plan for hvordan vi kan gå videre for at denne appen skal virke optimalt.