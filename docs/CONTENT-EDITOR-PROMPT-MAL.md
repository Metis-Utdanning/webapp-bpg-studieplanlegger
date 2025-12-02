# Content Editor Prompt - Mal for fagbeskrivelser

Denne malen brukes for å generere innhold til "Hvordan arbeider man i faget" og "Fagets relevans" i fagbeskrivelser.

## Prompt-mal

```
Du skal skrive innhold for "Hvordan arbeider man i faget" og "Fagets relevans" for [FAGNAVN].

**Faginfo:**
- Fagkode: [FAGKODE]
- Læreplan: [LÆREPLAN]
- Trinn: [VG2/VG3]
- Type: Valgfritt programfag

**VIKTIG KONTEKST - Fagforhold:**
[VELG EN:]

A) UAVHENGIG FAG: Dette faget kan tas uavhengig av andre fag. Selv om det finnes et [FAGNAVN nivå 1/2], er disse SEPARATE fag som ikke bygger på hverandre. Eleven kan ta dette faget uten å ha tatt det andre nivået.

B) FAG SOM BYGGER PÅ ANNET: Dette faget KREVER at eleven har tatt [FORKUNNSKAPSFAG] først. Det bygger direkte på kompetansen fra dette faget.

C) ENKELTSTÅENDE FAG: Dette er et enkeltstående fag uten nivåinndeling.

**Kompetansemål i faget (for kontekst):**
[LISTE KOMPETANSEMÅL]

**Kjerneelementer:**
[LISTE KJERNEELEMENTER]

**Din oppgave:**
1. Bruk WebFetch til å hente informasjon fra disse kildene:
   - https://www.udir.no/lk20/[LÆREPLAN] (læreplanen)
   - https://ndla.no (søk etter [FAGNAVN] ressurser)
   - https://www.ung.no (søk etter relevante studier og yrker)

2. Basert på informasjonen, skriv:
   - **Hvordan arbeider man i faget:** Beskriv arbeidsformer, metoder, typiske aktiviteter
   - **Fagets relevans:** Beskriv hvem faget passer for, videre studier og yrkesrelevans

**Krav til teksten:**
- Profesjonell men tilgjengelig tone for videregående-elever
- Konsekvent bruk av "du"-form
- Konkrete eksempler på arbeidsformer
- Kobling til kompetansemål uten å gjenta dem ordrett
- IKKE skriv at faget "bygger på" eller "fortsetter fra" et annet fag med mindre det er spesifisert i VIKTIG KONTEKST over
- For uavhengige fag: Nevn gjerne at faget kan tas uavhengig hvis det er relevant

Returner BARE ferdig tekst for begge seksjonene, formatert slik:

## Hvordan arbeider man i faget

[tekst]

## Fagets relevans

[tekst]
```

---

## Fag som mangler innhold (per november 2025)

### Uavhengige fag (kan tas separat fra nivå 1/2):
| Fag | Fagkode | Læreplan | Merknad |
|-----|---------|----------|---------|
| Rettslære 2 | SAM3058 | RTL01-05 | Uavhengig av Rettslære 1 |
| Biologi 2 | REA3036 | BIO01-02 | Uavhengig av Biologi 1 |
| Psykologi 2 | SAM3073 | PSY01-04 | Uavhengig av Psykologi 1 |
| Entreprenørskap 2 | SAM3064 | ENT01-04 | Uavhengig av nivå 1 |
| Musikk fordypning 2 | MUS3007 | MUS08-02 | Uavhengig av nivå 1 |

### Fag som bygger på annet fag:
| Fag | Fagkode | Læreplan | Krever |
|-----|---------|----------|--------|
| Fysikk 2 | REA3039 | FYS01-02 | Fysikk 1 |
| Kjemi 2 | REA3046 | KJE01-02 | Kjemi 1 |
| Matematikk R2 | REA3043 | MAT04-03 | Matematikk R1 |
| Engelsk 2 | SPR3030 | ENG04-02 | Engelsk 1 |
| Historie og filosofi 2 | SAM3043 | HIF01-04 | Historie og filosofi 1 |
| Markedsføring og ledelse 2 | SAM3046 | MFL01-04 | nivå 1 |
| Samfunnsøkonomi 2 | SAM3061 | SOK01-03 | Samfunnsøkonomi 1 |

### Enkeltstående fag:
| Fag | Fagkode | Læreplan |
|-----|---------|----------|
| Informasjonsteknologi 1 | REA3049 | INF01-02 |
| Matematikk 2P | MAT1020 | MAT09-02 |
| Matematikk R1 | REA3042 | MAT04-03 |
| Økonomi og ledelse | SAM3069 | NOK02-03 |
| Sosialkunnskap | SAM3055 | POS04-01 |
| Politikk og menneskerettigheter | SAM3051 | POS04-01 |
| Spansk I+II | FSP6237 | FSP01-02 |

---

## Kilder for informasjon

1. **UDIR (udir.no)** - Læreplan, kompetansemål, kjerneelementer
2. **NDLA (ndla.no)** - Fagstoff, arbeidsmetoder, ressurser
3. **Ung.no** - Utdanningsveier, yrkesbeskrivelser, studiemuligheter

---

## Eksempel på ferdig prompt for Rettslære 2

```
Du skal skrive innhold for "Hvordan arbeider man i faget" og "Fagets relevans" for Rettslære 2.

**Faginfo:**
- Fagkode: SAM3058
- Læreplan: RTL01-05
- Trinn: VG3
- Type: Valgfritt programfag

**VIKTIG KONTEKST - Fagforhold:**
UAVHENGIG FAG: Dette faget kan tas uavhengig av Rettslære 1. Selv om begge fagene heter "Rettslære", er dette SEPARATE fag som ikke bygger på hverandre. Eleven kan ta Rettslære 2 uten å ha tatt Rettslære 1.

**Kompetansemål i faget:**
- Utforske og drøfte skillet mellom rett og rettferdighet i en rettsstat
- Utforske og bruke ulike rettskilder for å løse juridiske problemstillinger
- Gjennomføre juridisk drøfting for å komme fram til en konklusjon
- Utforske menneskerettigheter og demokratiets stilling
- Bruke regler om saksbehandling, personvern, erstatning
- Utforske strafferett (seksuallovbrudd, voldslovbrudd, vinningslovbrudd)
- Drøfte miljørettslige spørsmål

**Kjerneelementer:**
- Juridisk refleksjon (rett vs rettferdighet, etikk)
- Juridisk metode (rettskilder, drøfting)
- Rettsreglene i samfunnet (individ vs stat, rettigheter og plikter)

**Din oppgave:**
1. Bruk WebFetch til å hente informasjon fra:
   - https://www.udir.no/lk20/rtl01-05
   - https://ndla.no (søk etter rettslære)
   - https://www.ung.no (søk etter jus, advokat, juridiske yrker)

2. Skriv ferdig tekst for begge seksjonene.

**Krav:**
- Profesjonell men tilgjengelig for VGS-elever
- Konsekvent "du"-form
- IKKE skriv at faget bygger på Rettslære 1
- Kan nevne at faget kan tas uavhengig av Rettslære 1

Returner ferdig tekst.
```
