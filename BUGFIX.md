# Arbeidsdokument for bugfix, feilsøking og feature-requests

Bugs som rapporteres her er basert på versjon som ligger på github, bygget inn på https://www.bergenprivategymnas.no/planlegger

## Innbyggingskode (med auto cache-busting)

```html
<!-- Container -->
<div id="studieplanlegger"></div>

<!-- JavaScript -->
<script>
  const v = Date.now();
  const base = 'https://fredeids-metis.github.io/studieplanlegger';

  // Last CSS
  ['styles/base', 'styles/brand', 'styles/components/modal', 'styles/studieplanlegger', 'styles/print']
    .forEach(p => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = `${base}/${p}.css?v=${v}`;
      document.head.appendChild(l);
    });

  // Last JS
  import(`${base}/src/studieplanlegger.js?v=${v}`).then(m => {
    new m.Studieplanlegger(document.getElementById('studieplanlegger'), {
      schoolId: 'bergen-private-gymnas',
      apiBaseUrl: `${base}/dist/api/v2`,
      apiVersion: 'v2'
    });
  });
</script>
```

## Bugs (aktive)
- Bilde og Grafisk skal IKKE gi fordypning. Dette er mediefag. Samme med Musikk fordypning 1 og 2 som ikke gir fordypning for studiespesialisernde
*Ingen kjente bugs per 26.11.2025*

## UI-forbedringer (aktive)

*Ingen aktive UI-forbedringer*

## Features (ønsket)
- 
-

## Fikset 26.11.2025

- Katalog-modal for Samfunnskunnskap, Geografi og fremmedspråk
- Forutsetning-validering for "bygger på"-fag (Kjemi 2, R2, etc.)
- Print-layout: liggende A4, smale marger, skjuler Squarespace header/footer
- Bilder vises nå korrekt i katalog-modal (absolutte URLer)
- Fordypning-visning for POS-fag (Sosiologi, Politikk, Sosialkunnskap)
- Kompakte fag-bokser i hovedvisning
- Fjernet timetall fra VG1/VG2/VG3 headers
- Redusert whitespace mellom kategorier
- Lik boks-størrelse for fellesfag og programfag-slots
