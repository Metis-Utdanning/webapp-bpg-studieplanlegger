#!/bin/bash

# UDIR Læreplan-henter - ALLE KATEGORIER
# Henter læreplandata for alle fag i de tre master-listene

CURRICULUM_DIR="data/curriculum"
API_BASE="https://data.udir.no/kl06/v201906"

echo "===================================="
echo "UDIR Læreplan-henter (Alle kategorier)"
echo "===================================="
echo ""

# Sjekk om jq er installert
if ! command -v jq &> /dev/null; then
    echo "❌ Feil: jq er ikke installert"
    echo "Installer med: brew install jq"
    exit 1
fi

# Funksjon for å hente JSON
fetch_json() {
    curl -s -H "Accept: application/json" "$1"
}

# Funksjon for å hente ett fag
fetch_fag() {
    local FAGNAVN="$1"
    local FAGKODE="$2"
    local LAEREPLAN_KODE="$3"
    local OUTPUT_FILE="$4"
    local TYPE="$5"
    local PROGRAM="$6"

    # Lag filnavn og ID
    FILE_ID=$(echo "$FAGNAVN" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/æ/ae/g' | sed 's/ø/o/g' | sed 's/å/a/g' | sed 's/+//g' | sed 's/,//g')

    echo "  📥 Henter fagkode..."
    FAGKODE_DATA=$(fetch_json "${API_BASE}/fagkoder/${FAGKODE}")

    if [ -z "$FAGKODE_DATA" ] || [ "$FAGKODE_DATA" = "null" ]; then
        echo "  ❌ Feil: Kunne ikke hente fagkode"
        return 1
    fi

    TITLE=$(echo "$FAGKODE_DATA" | jq -r '.tittel[] | select(.spraak == "nob") | .verdi' 2>/dev/null)

    # Hent opplæringsfag
    echo "  📥 Henter opplæringsfag..."
    OPPLAERINGSFAG_URL=$(echo "$FAGKODE_DATA" | jq -r '.opplaeringsfag[0]."url-data"' 2>/dev/null)

    if [ -z "$OPPLAERINGSFAG_URL" ] || [ "$OPPLAERINGSFAG_URL" = "null" ]; then
        echo "  ❌ Feil: Ingen opplæringsfag funnet"
        return 1
    fi

    OPPLAERINGSFAG=$(fetch_json "$OPPLAERINGSFAG_URL")

    # Hent læreplan
    echo "  📥 Henter læreplan..."
    LAEREPLAN_URL=$(echo "$OPPLAERINGSFAG" | jq -r '.["laereplan-referanse"][0]."url-data"' 2>/dev/null)
    LAEREPLAN=$(fetch_json "$LAEREPLAN_URL")
    LAEREPLAN_TITLE=$(echo "$LAEREPLAN" | jq -r '.tittel.tekst[] | select(.spraak == "nob") | .verdi' 2>/dev/null)

    # Hent kompetansemålsett
    echo "  📥 Henter kompetansemålsett..."
    KOMPMAAL_SETT_URL=$(echo "$OPPLAERINGSFAG" | jq -r '.["laereplan-referanse"][0]."tilhoerende-kompetansemaalsett"[0]."url-data"' 2>/dev/null)
    KOMPMAAL_SETT=$(fetch_json "$KOMPMAAL_SETT_URL")

    # Behandle innhold
    echo "  📄 Behandler innhold..."

    # Om faget
    OM_FAGET=$(echo "$LAEREPLAN" | jq -r '
      .["om-faget-kapittel"]["fagets-relevans-og-verdier"]["fagets-relevans"].beskrivelse.tekst[]
      | select(.spraak == "nob")
      | .verdi
    ' 2>/dev/null | sed 's/<[^>]*>//g')

    if [ -z "$OM_FAGET" ]; then
        OM_FAGET="_(Ikke tilgjengelig)_"
    fi

    # Kompetansemål
    MAAL_REFS=$(echo "$KOMPMAAL_SETT" | jq -r '.kompetansemaal[]."url-data"' 2>/dev/null)

    KOMPETANSEMAAL=""
    MAAL_COUNT=0
    KJERNE_URLS_FILE=$(mktemp)

    while IFS= read -r maal_url; do
        if [ ! -z "$maal_url" ] && [ "$maal_url" != "null" ]; then
            MAAL=$(fetch_json "$maal_url")

            MAAL_TEKST=$(echo "$MAAL" | jq -r '.tittel.tekst[] | select(.spraak == "nob") | .verdi' 2>/dev/null)

            if [ ! -z "$MAAL_TEKST" ] && [ "$MAAL_TEKST" != "null" ]; then
                KOMPETANSEMAAL="${KOMPETANSEMAAL}- ${MAAL_TEKST}"$'\n'
                MAAL_COUNT=$((MAAL_COUNT + 1))
            fi

            echo "$MAAL" | jq -r '.["tilknyttede-kjerneelementer"][]?.referanse."url-data" // empty' 2>/dev/null >> "$KJERNE_URLS_FILE"
        fi
    done <<< "$MAAL_REFS"

    # Kjerneelementer
    KJERNEELEMENTER=""
    KJERNE_COUNT=0
    UNIQUE_KJERNE_URLS=$(sort -u "$KJERNE_URLS_FILE")

    while IFS= read -r kjerne_url; do
        if [ ! -z "$kjerne_url" ] && [ "$kjerne_url" != "null" ]; then
            ELEMENT=$(fetch_json "$kjerne_url")

            TITTEL=$(echo "$ELEMENT" | jq -r '.tittel.tekst[]? | select(.spraak == "nob") | .verdi // empty' 2>/dev/null | head -1)
            BESKRIVELSE=$(echo "$ELEMENT" | jq -r '.beskrivelse.tekst[]? | select(.spraak == "nob") | .verdi // empty' 2>/dev/null | head -1 | sed 's/<[^>]*>//g')

            if [ ! -z "$TITTEL" ] && [ "$TITTEL" != "null" ]; then
                KJERNEELEMENTER="${KJERNEELEMENTER}### ${TITTEL}"$'\n\n'

                if [ ! -z "$BESKRIVELSE" ] && [ "$BESKRIVELSE" != "null" ]; then
                    KJERNEELEMENTER="${KJERNEELEMENTER}${BESKRIVELSE}"$'\n\n'
                fi

                KJERNE_COUNT=$((KJERNE_COUNT + 1))
            fi
        fi
    done <<< "$UNIQUE_KJERNE_URLS"

    rm -f "$KJERNE_URLS_FILE"

    if [ $KJERNE_COUNT -eq 0 ]; then
        KJERNEELEMENTER="_(Ingen kjerneelementer funnet)_"
    fi

    # Lag markdown-fil MED FRONTMATTER
    local PROGRAM_FIELD=""
    if [ ! -z "$PROGRAM" ]; then
        PROGRAM_FIELD="program: ${PROGRAM}"$'\n'
    fi

    cat > "$OUTPUT_FILE" << EOF
---
id: ${FILE_ID}
title: ${TITLE}
fagkode: ${FAGKODE}
lareplan: ${LAEREPLAN_KODE}
type: ${TYPE}
${PROGRAM_FIELD}vimeo: ""
generert: $(date '+%Y-%m-%d')
---

# ${TITLE}

**Læreplan:** ${LAEREPLAN_TITLE}

## Om faget

${OM_FAGET}

## Kompetansemål

${KOMPETANSEMAAL}

## Kjerneelementer

${KJERNEELEMENTER}

## Ressurser

<!-- Legg til Vimeo-lenke her når den er klar -->

---
*Hentet fra UDIR Grep API*
*Fagkode: ${FAGKODE}*
*Generert: $(date '+%Y-%m-%d %H:%M:%S')*
EOF

    echo "  ✅ $MAAL_COUNT mål, $KJERNE_COUNT kjerneelementer"
    return 0
}

# Funksjon for å prosessere en liste-fil
process_list() {
    local INPUT_FILE="$1"
    local OUTPUT_DIR="$2"
    local TYPE="$3"
    local CATEGORY_NAME="$4"
    local DEFAULT_PROGRAM="$5"

    if [ ! -f "$INPUT_FILE" ]; then
        echo "⚠️  Hopper over: $INPUT_FILE finnes ikke"
        return
    fi

    mkdir -p "$OUTPUT_DIR"

    TOTAL_FAGS=$(grep -v "^#" "$INPUT_FILE" | grep -v "^$" | wc -l | tr -d ' ')
    echo "📚 $CATEGORY_NAME: $TOTAL_FAGS fag"
    echo ""

    CURRENT=0
    SUCCESSFUL=0
    FAILED=0

    while IFS=';' read -r FAGNAVN FAGKODE LAEREPLAN_KODE; do
        [[ "$FAGNAVN" =~ ^#.*$ ]] && continue
        [[ -z "$FAGNAVN" ]] && continue

        FAGNAVN=$(echo "$FAGNAVN" | xargs)
        FAGKODE=$(echo "$FAGKODE" | xargs)
        LAEREPLAN_KODE=$(echo "$LAEREPLAN_KODE" | xargs)

        [[ -z "$FAGKODE" ]] && continue

        CURRENT=$((CURRENT + 1))

        FILENAME="${FAGNAVN// /_}.md"
        OUTPUT_FILE="${OUTPUT_DIR}/${FILENAME}"

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "[$CURRENT/$TOTAL_FAGS] $FAGNAVN ($TYPE)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        # Bestem program basert på fagkode
        PROGRAM=""
        if [[ "$FAGKODE" == MDD* ]] || [[ "$FAGKODE" == MUS* ]]; then
            PROGRAM="musikk-dans-drama"
        elif [[ "$FAGKODE" == MOK* ]]; then
            PROGRAM="medier-kommunikasjon"
        elif [ ! -z "$DEFAULT_PROGRAM" ]; then
            PROGRAM="$DEFAULT_PROGRAM"
        fi

        if fetch_fag "$FAGNAVN" "$FAGKODE" "$LAEREPLAN_KODE" "$OUTPUT_FILE" "$TYPE" "$PROGRAM"; then
            SUCCESSFUL=$((SUCCESSFUL + 1))
        else
            FAILED=$((FAILED + 1))
        fi

        echo ""

    done < "$INPUT_FILE"

    echo "  ✅ Vellykkede: $SUCCESSFUL"
    echo "  ❌ Feilet: $FAILED"
    echo ""
}

# HENT ALLE TRE KATEGORIER
echo "🚀 Starter henting av alle fag..."
echo ""

# 1. Fellesfag
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "KATEGORI 1: FELLESFAG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
process_list "$CURRICULUM_DIR/fellesfag_lk20.txt" "$CURRICULUM_DIR/fellesfag" "fellesfag" "Fellesfag" ""

# 2. Obligatoriske programfag
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "KATEGORI 2: OBLIGATORISKE PROGRAMFAG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
process_list "$CURRICULUM_DIR/obligatoriske-programfag_lk20.txt" "$CURRICULUM_DIR/obligatoriske-programfag" "obligatorisk-programfag" "Obligatoriske programfag" ""

# 3. Valgfrie programfag (SKIP - allerede har disse)
# echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# echo "KATEGORI 3: VALGFRIE PROGRAMFAG"
# echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# echo "⏭️  Hopper over - allerede hentet"
# echo ""

# OPPSUMMERING
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 FERDIG!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Alle manglende fag er nå hentet fra Udir API"
echo ""
echo "📁 Filer lagret i:"
echo "  - $CURRICULUM_DIR/fellesfag/"
echo "  - $CURRICULUM_DIR/obligatoriske-programfag/"
echo ""
