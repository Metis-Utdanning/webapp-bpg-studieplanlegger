/**
 * NoticeService - Håndterer betingede merknader/advarsler i blokkskjema-modal
 * Separert fra ValidationService som håndterer blokkering
 */

export const NOTICE_TYPES = {
  WARNING: 'warning',
  INFO: 'info'
};

export const CONDITIONAL_NOTICES = [
  {
    id: 'mat-1p-r1-s1-conflict',
    type: NOTICE_TYPES.WARNING,
    conditions: {
      vg1MathIn: ['matematikk-1p'],
      selectingFagIn: ['matematikk-r1', 'matematikk-s1']
    },
    message: 'Obs! Du har valgt matematikk 1P i VG1 og bør velge matematikk 2P i VG2 - Ta kontakt med faglærer for å diskutere dette!'
  },
  {
    id: 'fremmedsprak-fordypning-blokk3',
    type: NOTICE_TYPES.WARNING,
    conditions: {
      harFremmedsprak: false,
      currentTrinn: 'vg2',
      selectingFromBlokkIn: ['blokk3']
    },
    message: 'Obs! Du kan ikke fordype deg i faget du velger fra blokk 3 da fordypningsfagene herfra går samtidig med Spansk I+II.'
  },
  {
    id: 'studiespesialisering-musikk-fordypning',
    type: NOTICE_TYPES.INFO,
    conditions: {
      programomrade: 'studiespesialisering',
      selectingFagIn: ['musikk-fordypning-1', 'musikk-fordypning-2']
    },
    message: 'Obs! Dette faget er i hovedsak for elever på musikklinjen - Ta kontakt med fagrådgiver dersom du vurderer dette faget!'
  }
];

export class NoticeService {
  constructor() {
    this.notices = [...CONDITIONAL_NOTICES];
  }

  /**
   * Finn aktive merknader basert på kontekst
   * @param {Object} context - { state, currentTrinn, selectingFag, selectingBlokk }
   * @returns {Array} Liste med aktive merknader
   */
  getActiveNotices(context) {
    const { state, currentTrinn, selectingFag, selectingBlokk } = context;

    return this.notices.filter(notice => {
      return this._evaluateConditions(notice.conditions, {
        state,
        currentTrinn,
        selectingFag,
        selectingBlokk
      });
    });
  }

  /**
   * Evaluer alle betingelser for en merknad
   */
  _evaluateConditions(conditions, ctx) {
    const { state, currentTrinn, selectingFag, selectingBlokk } = ctx;

    // VG1 matematikk-sjekk
    if (conditions.vg1MathIn) {
      const vg1Selections = state.vg1?.selections || [];
      const vg1Math = vg1Selections.find(s => s.slot === 'matematikk');
      if (!vg1Math || !conditions.vg1MathIn.includes(vg1Math.id)) {
        return false;
      }
    }

    // Programområde-sjekk
    if (conditions.programomrade && state.programomrade !== conditions.programomrade) {
      return false;
    }

    // Fremmedspråk-status
    if (conditions.harFremmedsprak !== undefined) {
      if (state.harFremmedsprak !== conditions.harFremmedsprak) {
        return false;
      }
    }

    // Trinn-sjekk
    if (conditions.currentTrinn && currentTrinn !== conditions.currentTrinn) {
      return false;
    }

    // Fag som velges
    if (conditions.selectingFagIn && selectingFag) {
      const fagId = (typeof selectingFag === 'string' ? selectingFag : selectingFag.id || '').toLowerCase();
      if (!conditions.selectingFagIn.some(id => fagId.includes(id) || id.includes(fagId))) {
        return false;
      }
    }

    // Blokk som fag velges fra
    if (conditions.selectingFromBlokkIn && selectingBlokk) {
      const blokkId = selectingBlokk.toLowerCase();
      if (!conditions.selectingFromBlokkIn.some(id => blokkId.includes(id))) {
        return false;
      }
    }

    return true;  // Alle betingelser oppfylt
  }

  /**
   * Sjekk om et spesifikt fag har potensielle merknader
   */
  getFagNotices(fagId, context) {
    return this.getActiveNotices({
      ...context,
      selectingFag: fagId
    });
  }
}
