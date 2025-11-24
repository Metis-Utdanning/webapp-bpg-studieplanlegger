# Bugfix
- VG3-modal: Når 4 fag velges (som man må), blir bare 2 av fagene lagt til i planleggervisning (hovedvindu). Når man klikker seg inn i velgeren på nytt har faget fra "Blokk 4" forsvunnet" og man må velge det på ny. DA blir det plutselig mulig med 4 fag. Dette irriterende for brukeren. 
- Telleren som teller fag nullstilles ikke alltid. I VG3-modal har jeg valgt fag på nytt etter å ha trykker filter NEI til fremmedspråk på ungdomsskolen. Korrekt velges da Spansk I+II i VG1 og i VG3. Men når jeg da klikker meg inn i blokkskjema-modal (VG3) har telleren i "legg til fag" gått for langt. Selv om jeg i mitt "nåværende" skjema da bare har 4 fag (som er max), så vises "Legg til (7/4 fag). 
    Kan dette ha med å gjøre noe som skjer når man trykker på fremmedspråk u.skole i filter? 
- Psykologi 2 vises ikke som aktuelt fag i VG2: I UDIR sin fag og timefordeling skal det ikke stå "Bygger på" i Psykologi 2 og dette faget SKAL kunne tas i VG2, både før og samtidig med Psykologi 1. 
- Fagene Grafisk Design og Bilde er mediefag og skal hardkodes til å være EKSKLUDERT fra fordypining. Dette gjelder også Musikk fordypning 1 og Musikk Fordypning 2 som er programfag for Musikk (men som elever på studiespesialisende kan ta dersom de oppnår fordypning med andre fag). 
- 

# UI-forbedringer
- Fordypningsboksene må forsøkes å fås inn på 1 linje, at boksene ikke legger seg vertikalt over hverandre. For å unngå tekst-overflow kan teksten brytes, og gjøres noe mindre. Det går også an å lage noe mindre "Luft" i boksene ved å gjøre padding mindre. 
- BUG: Det virker som en random regel som gir "Fagnavn"-boksene INNE i Blokkskjema-modal ULIK FARGE, men uten tilsynelatende grunn til hvorfor. Noen blir av og til blå men jeg klarer ikke å skjønne sammenhengen. Analyser HVA som ligger til grunn for denne farge-endringen FØR vi endrer noe i tilfelle det er knyttet til valideringslogikk. 
- Grå knapp i stedet for grønn på "Hadde du fremmedspråk på ungdomsskolen". 
- legge til skyggeeffekter på filterknappene. 
- Lage NOE mindre luft i alle fag-bokser i blokkskjema og sørge for at tekst brytes slik at ikke noe forsvinner på laptop-visning (små skjermer). 

# Features
- 