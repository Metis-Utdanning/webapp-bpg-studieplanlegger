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

## Bugfix
- "Kryss"-knappen for å lukke KATALOG-modal virker ikke. Det virker å "trykke utenfor modal", men ikke å trykke selve krysset. 
- KATALOG-modal lastes ikke ved fellesfag: Markdown filer med informasjon skal ligge tilgjengelig i prosjektet under  /Users/fredrik/Documents/studieplanlegger/data/curriculum, og skal inneholde fagkode og annen id. Undersøk hva som skal til for å legge til disse fagene ved trykk på (i) Info-knapp uten at man ødelegger for eksisterende løsning på de valgfrie programfagene
- Rettslære 1 og Rettslære 2 trigger ikke fordypning korrekt: Forsøkt valgt innad i samme år (VG3-modal), men kommer ikke opp som fordypning i fordypnigsblokken. Rettslære-fagene ble ikke lagd på samme måte som øvrige fag fordi det var krøll med UDIR-API på Akkurat disse fagene: Sjekk om informasjon i .md filene er likt strukturert som øvrige fag. 
- Det er mulig å velge noen fag selv om det skal være tydelig markerte "BYGGER PÅ" i KILDEMATERIALET /data/. Eksempler: Kan velge R2 uten R1. Kan velge Kjemi 2 uten Kjemi 1. Kan velge markedsføring og ledelse 2 uten 1. Kan se ut som at det gjelder ALLE fag som "BYGGER PÅ", så her må vi gå gjennom logikken. Ønsket utfall: Fag som "BYGGER PÅ", skal være GRÅET UT i vg3-modal dersom de IKKE er valgt i VG2-modal. 

##  UI-forbedringer
- Lage lavere høyde i boksene som indikerer fag i hovedvisning (MÅL: se flere i høyden fag på laptop)
- Lage lavere høyde i boksene som indikerer fag, innad i blokkene i blokkskjema-modal (MÅL: se flere i høyden fag på laptop)
- Fjerne "TIMETALL" under henholdsvis VG1/VG2/VG3 i hovedoversikten; dette er for det første feil på programområdedene MUSIKK / MEDIER, og det er irrelevant. Dette betyr igjen at header-boksen som indikerer trinn kan lages noe "lavere" for å spare plass vertikalt. 
- Lage LITT mindre whitespace mellom "Matematikk (Klikk for å velge)" og "Programfag (Klikk for å velge)", samt tilsvarende mellom "Historie (velges i blokkskejam)" og "Programfag (klikk for å velge)". 
- Fremmedspråk-filter-button er ikke på linje med programfag-buttons. 
- "FJern alle fag" button er ikke på linje med programfag-buttons i filter. Alle Buttons i filter må være på linje. 

##  Features
- Legge til en "Ser du en feil? Send inn tilbakemelding" tekst nederst, under selve widgeten i hovedvisning: Skal lenke direkte til følgende URL: https://forms.office.com/e/Y7ekhKc9GD (Dette er et skjema som er lagd i Microsoft forms som går direkte til utvikler (meg))
- Finne en løsning for eksport av resultater som en PDF. 
    Kriterier: 
        - MÅ inneholde alle fag, tydelig etter trinn, lignende oppsett som hovedsiden (tre kolonner etter trinn). 
        - Må være innenfor rammen på 1 A4 ark
        - Må få med alle fag
        - Kun være mulig å eksportere et "gyldig utvalg" dvs. alle kriterier er møtt. 


## Trenger analyse
Hva skal til for å kunne definere FLERE blokkskjema, som kan byttes mellom ved behov?
Siden blokkskjema er annerledes fra ÅR til ÅR og vi kanskje ønsker flere varianter frem mot et prøvefagvalg (for å sjekke interesse)
Hvis jeg under schools/bergen-private-gymnas/ har blokkskjema_26-27_v1 og blokkskjema_26-27_v2 osv. Finnes det noen mulighet for å bytte mellom disse, eller kreves det nye "builds" underveis? Her trenger jeg å forstå arkitekturen bak hele studieplanleggeren og forstå implikasjonene ved å switche mellom. Selve innholdet i blokkene og tilhørende data (altså; FAGENE), skal jo være hentet fra et API? (Hvis ikke, forklar gjerne) - Hvordan er blokkskjemaet implementert?

 Hei Claude. Jeg vil jobbe videre med studieplanleggeren min (denne prosjektmappen). Jeg har et dokument; /Users/fredrik/Documents/studieplanlegger/BUGFIX.md
  som jeg har skrevet ned bugs, feature-requests og andre tanker om prosjektet som jeg ønsker å bruke som utgangspunkt for videre planlegging. Les og forstå
  HELE prosjektmappen, bruk eventuelt flere agenter ved behov. Lag et forslag til plan for hvordan vi kan gå videre for at denne appen skal virke optimalt.