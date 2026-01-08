/**
 * ValidationService - Unified validation logic for Studieplanlegger
 *
 * Loads all validation rules from API (regler.json) at initialization.
 * Single Source of Truth: All rules come from school-data/data/curriculum/regler.yml
 *
 * Provides:
 * - Pre-selection validation (can this fag be selected?)
 * - Consequence prediction (what happens if selected?)
 * - Fordypning tracking
 * - Real-time validation feedback
 */

// STREA/STSSA-klassifisering for visuell gruppering
const STREA_OMRADER = ['MAT', 'FYS', 'KJE', 'BIO', 'GEO', 'IT', 'TOF'];
const STSSA_OMRADER = ['SOK', 'OKO', 'MOL', 'ENT', 'POS', 'PSY', 'RET', 'HIF', 'ENG', 'FSP'];

// Matematikk er nøytral og kan telle for begge grupper
// R1+R2 + Fysikk 1+2 = gyldig STREA
// R1+R2 + Rettslære 1+2 = gyldig STSSA (matematikk "adopterer" STSSA)
const NEUTRAL_OMRADER = ['MAT'];

// Fargeklassifisering for UI basert på fagområde
const FAGOMRADE_FARGER = {
  // STREA (grønn) - Realfag
  MAT: 'realfag', FYS: 'realfag', KJE: 'realfag',
  BIO: 'realfag', GEO: 'realfag', IT: 'realfag', TOF: 'realfag',
  // STSSA (gul) - Språk, samfunn, økonomi
  SOK: 'samfunn', OKO: 'samfunn', MOL: 'samfunn', ENT: 'samfunn',
  POS: 'samfunn', PSY: 'samfunn', RET: 'samfunn', HIF: 'samfunn',
  ENG: 'samfunn', FSP: 'samfunn',
  // MDD (rød) - Musikk, dans og drama
  MUS: 'musikk', DAN: 'musikk', DRA: 'musikk',
  // MK (blå) - Medier og kommunikasjon
  KUN: 'medier', MED: 'medier'
};

// Eksporter konstantene for bruk i andre moduler
export { STREA_OMRADER, STSSA_OMRADER, NEUTRAL_OMRADER, FAGOMRADE_FARGER };

export class ValidationService {
  constructor() {
    // Will be loaded from API
    this.eksklusjoner = [];
    this.forutsetninger = [];
    this.fagomrader = {};
    this.fordypningKrav = {};
    this.spesialregler = {};

    // Computed from fagomrader
    this.fagomradeMap = {};     // fagId -> fagområdeKode
    this.fagomradeNavn = {};    // fagområdeKode -> displayName

    this.loaded = false;
    this.loadError = null;
  }

  /**
   * Initialize service with validation rules
   * @param {Object|string} reglerOrUrl - Either regler object (from v2 API) or URL to fetch from (v1 API)
   */
  async init(reglerOrUrl) {
    console.log('🔄 ValidationService: Starting init...');

    let regler;

    // If reglerOrUrl is an object, use it directly (v2 API - already loaded)
    if (typeof reglerOrUrl === 'object' && reglerOrUrl !== null) {
      console.log('✅ Using regler from v2 API (already loaded)');
      regler = reglerOrUrl;
    }
    // If reglerOrUrl is a string, fetch from URL (v1 API - legacy)
    else if (typeof reglerOrUrl === 'string') {
      try {
        const url = `${reglerOrUrl}/curriculum/regler.json`;
        console.log('🔄 ValidationService: Fetching from', url);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load regler.json: ${response.status}`);
        }
        regler = await response.json();
      } catch (error) {
        this.loadError = error;
        console.error('❌ CRITICAL: ValidationService failed to load rules:', error);
        console.error('   Widget cannot function without validation rules.');
        throw error;  // Fail fast - no fallback!
      }
    }
    // No regler provided - FAIL
    else {
      const error = new Error('No regler provided to ValidationService.init()');
      console.error('❌ CRITICAL:', error.message);
      console.error('   Widget cannot function without validation rules.');
      throw error;  // Fail fast - no fallback!
    }

    // Load all rule sets from regler object
    this.eksklusjoner = regler.eksklusjoner || [];

    // Normalize forutsetninger: ensure fag is always an array
    this.forutsetninger = (regler.forutsetninger || []).map(f => ({
      ...f,
      fag: Array.isArray(f.fag) ? f.fag : [f.fag]  // Convert string to array
    }));

    this.fagomrader = regler.fagomrader || {};
    this.fordypningKrav = regler.fordypning || {};
    this.spesialregler = regler.spesialregler || {};

    // Build reverse lookup maps from fagomrader
    this._buildFagomradeMaps();

    this.loaded = true;
    console.log('✅ ValidationService loaded rules');
    console.log(`   - ${this.eksklusjoner.length} eksklusjoner`);
    console.log(`   - ${this.forutsetninger.length} forutsetninger`);
    console.log(`   - ${Object.keys(this.fagomrader).length} fagområder`);
    return true;
  }

  /**
   * Build fagId -> fagområde mappings from API data
   */
  _buildFagomradeMaps() {
    this.fagomradeMap = {};
    this.fagomradeNavn = {};

    for (const [kode, data] of Object.entries(this.fagomrader)) {
      this.fagomradeNavn[kode] = data.navn;

      if (data.fag) {
        for (const fagId of data.fag) {
          this.fagomradeMap[fagId] = kode;
        }
      }
    }
  }

  /**
   * Get all selected fag IDs from state (VG2 + VG3)
   * Updated to use unified selections[] structure
   *
   * @param {Object} state - Current state
   * @param {string} excludeTrinn - Optional: Exclude this trinn (to avoid double-counting in modal)
   */
  getAllSelectedFagIds(state, excludeTrinn = null) {
    const ids = [];

    // Get all VG2 selections (includes matematikk + programfag)
    // FIXED (2024-11-24): Skip if excludeTrinn='vg2' (modal is open for VG2)
    if (state.vg2?.selections && excludeTrinn !== 'vg2') {
      state.vg2.selections.forEach(f => ids.push(f.id || f.fagkode));
    }

    // Get all VG3 selections (includes historie + programfag)
    // FIXED (2024-11-24): Skip if excludeTrinn='vg3' (modal is open for VG3)
    if (state.vg3?.selections && excludeTrinn !== 'vg3') {
      state.vg3.selections.forEach(f => ids.push(f.id || f.fagkode));
    }

    return ids.filter(Boolean).map(id => id.toLowerCase());
  }

  /**
   * PRE-SELECTION: Check if a fag can be selected
   * Returns status and reasons BEFORE the user clicks
   *
   * @param {string} fagId - The fag to check
   * @param {Object} state - Current state
   * @param {string} trinn - 'vg2' or 'vg3'
   * @param {Array} currentModalSelections - Currently selected in modal
   * @returns {Object} { status: 'available'|'blocked'|'warning'|'selected', reasons: [], cssClass: '' }
   */
  canSelectFag(fagId, state, trinn, currentModalSelections = []) {
    const result = {
      status: 'available',
      reasons: [],
      cssClass: '',
      suggestion: null
    };

    const normalizedFagId = fagId.toLowerCase();
    // FIXED (2024-11-24): Exclude current trinn from state to avoid double-counting
    // Modal selections ARE the current trinn, so don't count state's version
    const otherTrinnSelected = this.getAllSelectedFagIds(state, trinn);
    const modalSelectedIds = currentModalSelections.map(f => (f.id || f.fagkode || '').toLowerCase());
    const combinedSelected = [...otherTrinnSelected, ...modalSelectedIds];

    // 1. Check if already selected in this modal
    if (modalSelectedIds.includes(normalizedFagId)) {
      result.status = 'selected';
      result.cssClass = 'selected';
      return result;
    }

    // 2. Check if already selected in OTHER trinn (cross-year duplicate)
    if (otherTrinnSelected.includes(normalizedFagId)) {
      result.status = 'blocked';
      result.cssClass = 'invalid-duplicate';
      result.reasons.push('Du har allerede dette faget i et annet trinn');
      return result;
    }

    // 3. Check blocking exclusions (from API)
    const exclusionCheck = this._checkExclusions(normalizedFagId, combinedSelected);
    if (exclusionCheck.blocked) {
      result.status = 'blocked';
      result.cssClass = 'blocked';
      result.reasons = exclusionCheck.reasons;
      result.suggestion = exclusionCheck.suggestion;
      return result;
    }

    // 4. Check prerequisites (can be 'blocking' or 'warning' based on rule type)
    // Use combinedSelected for prerequisite check (includes current modal selections)
    const prereqCheck = this._checkPrerequisites(normalizedFagId, combinedSelected, trinn);
    if (!prereqCheck.met) {
      if (prereqCheck.type === 'blocking') {
        // Blocking prerequisite - cannot select without prerequisite
        result.status = 'blocked';
        result.cssClass = 'blocked-prerequisite';
        result.reasons.push(prereqCheck.message);
        result.suggestion = prereqCheck.suggestion;
        return result;
      } else {
        // Warning prerequisite - allowed but shows warning
        result.status = 'warning';
        result.cssClass = 'missing-prerequisite';
        result.reasons.push(prereqCheck.message);
        result.suggestion = prereqCheck.suggestion;
      }
    }

    return result;
  }

  /**
   * Check exclusion rules from API
   * Supports two formats:
   * - gruppe: simple mutual exclusion (all items conflict with each other)
   * - konfliktGrupper: group vs group (items from different groups conflict)
   */
  _checkExclusions(fagId, selectedFagIds) {
    const reasons = [];
    let suggestion = null;

    for (const eksklusjon of this.eksklusjoner) {
      if (eksklusjon.type !== 'blocking') continue;

      // Format 1: konfliktGrupper - group vs group conflicts
      // e.g. S-linja [s1,s2] vs R-linja [r1,r2] - R1+R2 is OK, but R1+S1 is not
      if (eksklusjon.konfliktGrupper) {
        // Find which group (if any) the fagId belongs to
        let fagGroup = null;
        for (const group of eksklusjon.konfliktGrupper) {
          if (group.includes(fagId)) {
            fagGroup = group;
            break;
          }
        }

        if (fagGroup) {
          // Check if any selected fag is in a DIFFERENT group
          for (const otherGroup of eksklusjon.konfliktGrupper) {
            if (otherGroup === fagGroup) continue; // Same group is OK

            const conflict = otherGroup.find(id => selectedFagIds.includes(id));
            if (conflict) {
              reasons.push(eksklusjon.feilmelding || eksklusjon.beskrivelse);
              suggestion = eksklusjon.forslag;
              break;
            }
          }
        }
      }
      // Format 2: gruppe - simple mutual exclusion (original format)
      else if (eksklusjon.gruppe?.includes(fagId)) {
        const conflict = eksklusjon.gruppe.find(id =>
          id !== fagId && selectedFagIds.includes(id)
        );
        if (conflict) {
          reasons.push(eksklusjon.feilmelding || eksklusjon.beskrivelse);
          suggestion = eksklusjon.forslag;
        }
      }
    }

    return {
      blocked: reasons.length > 0,
      reasons,
      suggestion
    };
  }

  /**
   * Check prerequisites from API
   * Returns: { met: true/false, type: 'blocking'/'warning', message, suggestion }
   */
  _checkPrerequisites(fagId, selectedFagIds, trinn) {
    // Only check prerequisites for VG3
    if (trinn !== 'vg3') {
      return { met: true };
    }

    for (const prereq of this.forutsetninger) {
      // FIXED: prereq.fag is normalized to array in init(), so use .includes()
      const normalizedFagId = fagId.toLowerCase();
      const prereqFagIds = prereq.fag.map(f => f.toLowerCase());

      if (prereqFagIds.includes(normalizedFagId)) {
        const hasPrereq = prereq.krever.some(req =>
          selectedFagIds.includes(req.toLowerCase())
        );
        if (!hasPrereq) {
          return {
            met: false,
            type: prereq.type || 'warning',  // 'blocking' or 'warning'
            message: prereq.feilmelding || `Krever: ${prereq.krever.join(' eller ')}`,
            suggestion: prereq.forslag
          };
        }
      }
    }

    return { met: true };
  }

  /**
   * CONSEQUENCES: What happens if this fag is selected?
   */
  getConsequences(fagId, state) {
    const normalizedFagId = fagId.toLowerCase();
    const consequences = {
      willBlock: [],
      willEnable: [],
      fordypningImpact: null
    };

    // Find what will be blocked by checking exclusions
    for (const eksklusjon of this.eksklusjoner) {
      if (eksklusjon.type !== 'blocking') continue;

      // Format 1: konfliktGrupper - only block items from OTHER groups
      if (eksklusjon.konfliktGrupper) {
        let fagGroup = null;
        for (const group of eksklusjon.konfliktGrupper) {
          if (group.includes(normalizedFagId)) {
            fagGroup = group;
            break;
          }
        }
        if (fagGroup) {
          for (const otherGroup of eksklusjon.konfliktGrupper) {
            if (otherGroup === fagGroup) continue;
            for (const otherId of otherGroup) {
              consequences.willBlock.push({
                id: otherId,
                navn: this._getFagNavn(otherId),
                reason: eksklusjon.beskrivelse
              });
            }
          }
        }
      }
      // Format 2: gruppe - block all others in same group
      else if (eksklusjon.gruppe?.includes(normalizedFagId)) {
        for (const otherId of eksklusjon.gruppe) {
          if (otherId !== normalizedFagId) {
            consequences.willBlock.push({
              id: otherId,
              navn: this._getFagNavn(otherId),
              reason: eksklusjon.beskrivelse
            });
          }
        }
      }
    }

    // Find what will be enabled (prerequisites fulfilled)
    for (const prereq of this.forutsetninger) {
      if (prereq.krever.includes(normalizedFagId)) {
        consequences.willEnable.push({
          id: prereq.fag,
          navn: this._getFagNavn(prereq.fag)
        });
      }
    }

    // Fordypning impact
    const fagomrade = this.fagomradeMap[normalizedFagId];
    if (fagomrade) {
      consequences.fordypningImpact = {
        area: fagomrade,
        areaName: this.fagomradeNavn[fagomrade],
        adds: 140 // Standard timer per fag
      };
    }

    return consequences;
  }

  /**
   * Get display name for a fag (fallback to ID)
   */
  _getFagNavn(fagId) {
    // Convert ID to readable name
    return fagId
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * FORDYPNING: Calculate current fordypning status
   */
  getFordypningStatus(state, programomrade = 'studiespesialisering') {
    const krav = this.fordypningKrav[programomrade] || this.fordypningKrav.studiespesialisering || {
      minTimer: 560,
      minOmrader: 2,
      timerPerOmrade: 280
    };

    // Skip fordypning validation if not required for this programområde (e.g., Musikk, Medier)
    if (krav.minOmrader === 0) {
      return {
        areas: [],
        fordypninger: [],
        antallFordypninger: 0,
        totalTimer: 0,
        required: 0,
        requiredFordypninger: 0,
        isValid: true,
        notRequired: true,
        progress: 100,
        missingFordypninger: 0,
        missingTimer: 0
      };
    }

    const allFag = this.getAllSelectedFagIds(state);
    const fagomradeMap = {};

    // NEW LOGIC (2024-11-24): 1 fordypning = 2 fag from SAME fagområde (not timer-based)
    // Exclude: Matematikk 2P (fellesfag, not fordypning), Spansk I+II (obligatorisk, not fordypning)
    // FIXED (2024-11-24): Also exclude mediefag and musikkfag (not ST fordypning)
    const excludedFromFordypning = [
      'matematikk-2p',
      'spansk-i-ii',
      'spansk-i-ii-vg3',
      // Mediefag - programfag for Medier, ikke ST-fordypning
      'grafisk-design',
      'bilde',
      // Musikkfag - programfag for Musikk, ikke ST-fordypning
      'musikk-fordypning-1',
      'musikk-fordypning-2'
    ];

    // Group fag by fagområde
    allFag.forEach(fagId => {
      // Skip fag that don't count toward fordypning
      if (excludedFromFordypning.includes(fagId)) {
        return;
      }

      const fagomrade = this.fagomradeMap[fagId];
      if (fagomrade) {
        if (!fagomradeMap[fagomrade]) {
          fagomradeMap[fagomrade] = {
            code: fagomrade,
            name: this.fagomradeNavn[fagomrade] || fagomrade,
            fag: [],
            timer: 0
          };
        }
        fagomradeMap[fagomrade].fag.push(fagId);
        fagomradeMap[fagomrade].timer += 140;
      }
    });

    // Build area details
    const areas = Object.values(fagomradeMap).map(area => ({
      code: area.code,
      name: area.name,
      timer: area.timer,
      fagCount: area.fag.length,
      fag: area.fag,
      isFordypning: area.fag.length >= 2  // 2+ fag = 1 fordypning
    }));

    // Sort by fagCount (descending), then by timer
    areas.sort((a, b) => {
      if (b.fagCount !== a.fagCount) return b.fagCount - a.fagCount;
      return b.timer - a.timer;
    });

    // Count fordypninger (fagområder with 2+ fag)
    const fordypninger = areas.filter(a => a.isFordypning);
    const antallFordypninger = fordypninger.length;

    // Calculate total timer from all fordypninger
    const totalFordypningTimer = fordypninger.reduce((sum, a) => sum + a.timer, 0);

    // Klassifiser oppfylte områder etter STREA/STSSA
    const oppfylteOmrader = fordypninger.map(f => f.code);
    const streaOmrader = oppfylteOmrader.filter(o => STREA_OMRADER.includes(o));
    const stssaOmrader = oppfylteOmrader.filter(o => STSSA_OMRADER.includes(o));

    // Sjekk at alle fordypninger er fra samme STREA/STSSA-gruppe
    // Matematikk (MAT) er nøytral og "adopterer" gruppen til de andre fordypningene
    const gruppeValidering = this._validateFordypningSammeGruppe(oppfylteOmrader);

    // Valid if meets minOmrader requirement AND all fordypninger are from same gruppe
    const isValid = antallFordypninger >= krav.minOmrader && gruppeValidering.valid;
    const progress = Math.min(100, Math.round((antallFordypninger / krav.minOmrader) * 100));

    // Beregn profil basert på fordypninger
    const profil = this._getProfil(streaOmrader, stssaOmrader);
    const profilFarge = this._getProfilFarge(streaOmrader, stssaOmrader);

    return {
      areas,
      fordypninger,  // fagområder with 2+ fag
      antallFordypninger,
      totalTimer: totalFordypningTimer,
      required: krav.minTimer,  // Keep for legacy compatibility
      requiredFordypninger: krav.minOmrader,
      isValid,
      progress,
      missingFordypninger: Math.max(0, krav.minOmrader - antallFordypninger),
      missingTimer: Math.max(0, krav.minTimer - totalFordypningTimer),  // Keep for legacy
      // Ny: STREA/STSSA-klassifisering
      streaCount: streaOmrader.length,
      stssaCount: stssaOmrader.length,
      profil,
      profilFarge,
      // Ny: Gruppe-validering (alle fordypninger må være fra samme STREA/STSSA-gruppe)
      gruppeValidering: gruppeValidering,
      gruppeError: gruppeValidering.message
    };
  }

  /**
   * Beregn fordypningsprofil basert på STREA/STSSA-fordeling
   * @private
   */
  _getProfil(streaOmrader, stssaOmrader) {
    if (streaOmrader.length >= 2 && stssaOmrader.length === 0) return 'Realfagsprofil';
    if (stssaOmrader.length >= 2 && streaOmrader.length === 0) return 'Samfunnsprofil';
    if (streaOmrader.length >= 1 && stssaOmrader.length >= 1) return 'Kombinert profil';
    return null;
  }

  /**
   * Beregn profilfarge for UI-visning
   * @private
   */
  _getProfilFarge(streaOmrader, stssaOmrader) {
    if (streaOmrader.length >= 2 && stssaOmrader.length === 0) return 'realfag'; // grønn
    if (stssaOmrader.length >= 2 && streaOmrader.length === 0) return 'samfunn'; // gul
    if (streaOmrader.length >= 1 && stssaOmrader.length >= 1) return 'blandet'; // gradient
    return 'default';
  }

  /**
   * Valider at alle ikke-nøytrale fordypninger er fra samme STREA/STSSA-gruppe
   * Matematikk (MAT) er nøytral og "adopterer" gruppen til de andre fordypningene
   *
   * Eksempler:
   * - R1+R2 + Fysikk 1+2 = gyldig STREA
   * - R1+R2 + Rettslære 1+2 = gyldig STSSA (matematikk adopterer STSSA)
   * - S1+S2 + Fysikk 1+2 = gyldig STREA
   * - Fysikk 1+2 + Rettslære 1+2 = UGYLDIG (blandet STREA og STSSA)
   *
   * @param {Array} oppfylteOmrader - Array av fagområdekoder som har oppfylt fordypning (2+ fag)
   * @returns {Object} { valid: boolean, gruppe: string|null, message: string|null }
   * @private
   */
  _validateFordypningSammeGruppe(oppfylteOmrader) {
    // Filtrer ut nøytrale fagområder
    const ikkeNoytraleOmrader = oppfylteOmrader.filter(o => !NEUTRAL_OMRADER.includes(o));

    if (ikkeNoytraleOmrader.length === 0) {
      // Kun nøytrale fordypninger (f.eks. bare matematikk) - alltid gyldig
      return { valid: true, gruppe: null, message: null };
    }

    // Tell STREA og STSSA
    const streaOmrader = ikkeNoytraleOmrader.filter(o => STREA_OMRADER.includes(o));
    const stssaOmrader = ikkeNoytraleOmrader.filter(o => STSSA_OMRADER.includes(o));

    // Alle ikke-nøytrale må være fra SAMME gruppe
    const erKunStrea = streaOmrader.length > 0 && stssaOmrader.length === 0;
    const erKunStssa = stssaOmrader.length > 0 && streaOmrader.length === 0;

    if (erKunStrea) {
      return { valid: true, gruppe: 'STREA', message: null };
    }
    if (erKunStssa) {
      return { valid: true, gruppe: 'STSSA', message: null };
    }

    // Blandet - ugyldig
    // Lag lesbare navn for feilmeldingen
    const streaNavnListe = streaOmrader.map(o => this.fagomradeNavn[o] || o).join(', ');
    const stssaNavnListe = stssaOmrader.map(o => this.fagomradeNavn[o] || o).join(', ');

    return {
      valid: false,
      gruppe: null,
      message: `Fordypning må være fra samme programområde. Du har fordypning fra både realfag (${streaNavnListe}) og samfunn/språk (${stssaNavnListe}). Velg fag fra kun én gruppe.`
    };
  }

  /**
   * Hent fargeklasse for et fag basert på fagområde
   * @param {string} fagId - Fag-ID
   * @returns {string} CSS-klasse for farge (realfag, samfunn, musikk, medier, default)
   */
  getFagFargeKlasse(fagId) {
    const fagomrade = this.fagomradeMap[fagId?.toLowerCase()];
    if (!fagomrade) return 'default';
    return FAGOMRADE_FARGER[fagomrade] || 'default';
  }

  /**
   * FULL VALIDATION: Validate entire study plan
   */
  validateAll(state, programomrade = 'studiespesialisering') {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    const allFag = this.getAllSelectedFagIds(state);

    // 1. Check all blocking exclusions
    for (const eksklusjon of this.eksklusjoner) {
      if (eksklusjon.type !== 'blocking') continue;

      let hasConflict = false;

      // Format 1: konfliktGrupper - check if fag from different groups are selected
      if (eksklusjon.konfliktGrupper) {
        const groupsWithSelections = eksklusjon.konfliktGrupper.filter(group =>
          group.some(id => allFag.includes(id))
        );
        hasConflict = groupsWithSelections.length > 1;
      }
      // Format 2: gruppe - check if multiple from same group
      else if (eksklusjon.gruppe) {
        const matchCount = eksklusjon.gruppe.filter(id => allFag.includes(id)).length;
        hasConflict = matchCount > 1;
      }

      if (hasConflict) {
        result.valid = false;
        result.errors.push({
          type: 'exclusion',
          id: eksklusjon.id,
          message: eksklusjon.feilmelding || eksklusjon.beskrivelse,
          suggestion: eksklusjon.forslag
        });
      }
    }

    // 2. Check fordypning (only for studiespesialisering)
    if (programomrade?.includes('studiespesialisering')) {
      const fordypning = this.getFordypningStatus(state, programomrade);
      if (!fordypning.isValid && allFag.length >= 4) {
        result.warnings.push({
          type: 'fordypning',
          message: `Fordypning: ${fordypning.totalTimer}/${fordypning.required} timer`,
          details: fordypning.missingAreas > 0
            ? `Mangler ${fordypning.missingAreas} fagområde(r) med minst ${fordypning.timerPerArea} timer`
            : `Mangler ${fordypning.missingTimer} timer`,
          suggestion: 'Velg flere fag fra samme fagområde for å oppnå fordypning'
        });
      }
    }

    // 3. Check prerequisites (warnings)
    for (const prereq of this.forutsetninger) {
      if (allFag.includes(prereq.fag)) {
        const hasPrereq = prereq.krever.some(req => allFag.includes(req));
        if (!hasPrereq) {
          result.warnings.push({
            type: 'prerequisite',
            message: prereq.feilmelding,
            suggestion: prereq.forslag
          });
        }
      }
    }

    return result;
  }

  /**
   * VALIDATE MODAL SELECTION: Check current modal selections
   */
  validateModalSelection(selectedFag, state, trinn) {
    const result = {
      valid: true,
      errors: [],
      canSubmit: true
    };

    const selectedIds = selectedFag.map(f => (f.id || f.fagkode || '').toLowerCase());
    // FIXED (2024-11-24): Exclude current trinn to avoid double-counting
    const otherTrinnIds = this.getAllSelectedFagIds(state, trinn);
    const allIds = [...otherTrinnIds, ...selectedIds];

    // Check for duplicates within selection
    const seen = new Set();
    const duplicates = [];
    selectedIds.forEach(id => {
      if (seen.has(id)) {
        duplicates.push(id);
      }
      seen.add(id);
    });

    if (duplicates.length > 0) {
      result.valid = false;
      result.canSubmit = false;
      result.errors.push({
        type: 'duplicate',
        message: `Duplikat: ${duplicates.join(', ')}`,
        fagIds: duplicates
      });
    }

    // Check all exclusions
    for (const eksklusjon of this.eksklusjoner) {
      if (eksklusjon.type !== 'blocking') continue;

      let hasConflict = false;
      let conflictingFagIds = [];

      // Format 1: konfliktGrupper
      if (eksklusjon.konfliktGrupper) {
        const groupsWithSelections = eksklusjon.konfliktGrupper.filter(group =>
          group.some(id => allIds.includes(id))
        );
        hasConflict = groupsWithSelections.length > 1;
        if (hasConflict) {
          conflictingFagIds = eksklusjon.konfliktGrupper
            .flat()
            .filter(id => allIds.includes(id));
        }
      }
      // Format 2: gruppe
      else if (eksklusjon.gruppe) {
        const matches = eksklusjon.gruppe.filter(id => allIds.includes(id));
        hasConflict = matches.length > 1;
        conflictingFagIds = matches;
      }

      if (hasConflict) {
        result.valid = false;
        result.canSubmit = false;
        result.errors.push({
          type: 'exclusion',
          message: eksklusjon.feilmelding || eksklusjon.beskrivelse,
          fagIds: conflictingFagIds
        });
      }
    }

    return result;
  }

  /**
   * Get exclusion rules (for external use)
   */
  getEksklusjoner() {
    return this.eksklusjoner;
  }

  /**
   * Get prerequisite rules (for external use)
   */
  getForutsetninger() {
    return this.forutsetninger;
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.loaded;
  }

  /**
   * CROSS-TRINN VALIDATION: Validate VG2 + VG3 selections together
   *
   * This method performs holistic validation across both VG2 and VG3, checking:
   * - Cross-trinn math conflicts (R1 VG2 + S1 VG3 = blocked)
   * - Fordypning requirements (560t from 2+ fagområder)
   * - Combined prerequisite chains
   *
   * @param {Array} vg2Selections - VG2 selections array (includes matematikk + programfag)
   * @param {Array} vg3Selections - VG3 selections array (includes historie + programfag)
   * @param {Object} context - Additional context
   * @param {string} context.programomrade - Program area (e.g., 'studiespesialisering')
   * @param {boolean} context.harFremmedsprak - Has foreign language from ungdomsskole
   * @returns {Object} { valid: boolean, errors: [], warnings: [], fordypning: {} }
   */
  validateCombinedSelections(vg2Selections = [], vg3Selections = [], context = {}) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      fordypning: {
        totalTimer: 0,
        fagomrader: {},
        fagomraderCount: 0,
        requiredTimer: 560,
        isMet: false
      }
    };

    // Combine all selections for cross-trinn checks
    const allSelections = [...vg2Selections, ...vg3Selections];
    const allFagIds = allSelections.map(f => (f.id || f.fagkode).toLowerCase());

    // ========================================================================
    // 1. CROSS-TRINN MATH CONFLICTS
    // ========================================================================
    // Check if there are math conflicts across VG2 and VG3
    // Example: R1 in VG2 + S1 in VG3 = BLOCKED (different lines)
    //          R1 in VG2 + R2 in VG3 = OK (same line)

    // Helper to detect matematikk-fag (includes Statistikk and Matematikk for økonomifag)
    const isMathFag = (f) => {
      const id = (f.id || '').toLowerCase();
      const fagkode = (f.fagkode || '').toUpperCase();
      const matematikkIds = ['statistikk', 'matematikk-for-okonomifag'];
      return id.startsWith('matematikk') || fagkode.startsWith('MAT') || matematikkIds.includes(id);
    };

    const vg2MathFag = vg2Selections.find(isMathFag);
    const vg3MathFag = vg3Selections.find(isMathFag);

    if (vg2MathFag && vg3MathFag) {
      const vg2MathId = (vg2MathFag.id || vg2MathFag.fagkode).toLowerCase();
      const vg3MathId = (vg3MathFag.id || vg3MathFag.fagkode).toLowerCase();

      // Check if they're in conflicting groups (R vs S)
      // FIXED: Check for type='blocking' AND konfliktGrupper property
      // konfliktGrupper is array of arrays with fag IDs directly (not objects with .fag)
      const mathConflict = this.eksklusjoner.find(eks => {
        // Must be blocking type with konfliktGrupper
        if (eks.type !== 'blocking' || !eks.konfliktGrupper) return false;

        // Find which group each math fag belongs to
        // konfliktGrupper format: [[s1, s2], [r1, r2]] - arrays of fag IDs
        const vg2GroupIndex = eks.konfliktGrupper.findIndex(group =>
          group.some(id => id.toLowerCase() === vg2MathId)
        );
        const vg3GroupIndex = eks.konfliktGrupper.findIndex(group =>
          group.some(id => id.toLowerCase() === vg3MathId)
        );

        // Both must be in the exclusion, but in DIFFERENT groups
        // R1 and R2 are in same group (index matches) - OK
        // R1 and S1 are in different groups (indices differ) - BLOCKED
        return vg2GroupIndex !== -1 && vg3GroupIndex !== -1 && vg2GroupIndex !== vg3GroupIndex;
      });

      if (mathConflict) {
        result.valid = false;
        result.errors.push({
          type: 'cross-trinn-math-conflict',
          message: `Du kan ikke kombinere ${vg2MathFag.navn} (VG2) med ${vg3MathFag.navn} (VG3) - de tilhører ulike matematikk-linjer`,
          fagIds: [vg2MathId, vg3MathId],
          suggestion: 'Velg matematikk fra samme linje (enten R-linjen eller S-linjen) på både VG2 og VG3'
        });
      }
    }

    // ========================================================================
    // 2. FORDYPNING CALCULATION (VG2 + VG3 combined)
    // ========================================================================
    // NEW LOGIC (2024-11-24): 1 fordypning = 2 fag from SAME fagområde
    // Requirement: 2 fordypninger total (not timer-based)
    // Uses fagområde from regler.yml (not læreplankode!)

    // Get fordypning requirements for this programområde
    const programomrade = context.programomrade || 'studiespesialisering';
    const fordypningKrav = this.fordypningKrav[programomrade] || this.fordypningKrav.studiespesialisering || {
      minTimer: 560,
      minOmrader: 2
    };

    // Skip fordypning validation if not required for this programområde (e.g., Musikk, Medier)
    if (fordypningKrav.minOmrader === 0) {
      result.fordypning = {
        totalTimer: 0,
        fagomrader: {},
        fordypninger: 0,
        requiredFordypninger: 0,
        isMet: true,
        notRequired: true
      };
      // Skip to next validation section - do not add fordypning errors
    } else {
      // Only calculate fordypning if required for this programområde
      const fagomraderMap = {};

      // Fag excluded from fordypning calculation
      // FIXED (2024-11-24): Also exclude mediefag and musikkfag
      const excludedFromFordypning = [
        'matematikk-2p',
        'spansk-i-ii',
        'spansk-i-ii-vg3',
        'grafisk-design',
        'bilde',
        'musikk-fordypning-1',
        'musikk-fordypning-2'
      ];

      // Group fag by fagområde (from regler.yml fagomrader)
      allSelections.forEach(fag => {
        const fagId = (fag.id || fag.fagkode || '').toLowerCase();

        // Skip fag that don't count toward fordypning
        if (excludedFromFordypning.includes(fagId)) {
          return;
        }

        // Skip fellesfag (historie, etc.) - matematikk counts if it's a programfag
        if (fag.type === 'fellesfag' && fag.slot !== 'matematikk') return;

        const timer = parseInt(fag.timer) || 140;

        // Get fagområde from fagomradeMap (built from regler.yml)
        const fagomrade = this.fagomradeMap[fagId];

        if (!fagomrade) {
          // Skip warning for fellesfag (e.g., historie-vg3)
          if (fag.type === 'fellesfag') {
            return; // Silent skip
          }
          console.warn(`⚠️ Fag ${fagId} (${fag.navn}) mangler fagområde - teller ikke mot fordypning`);
          return;
        }

        // Add to fagområde map
        if (!fagomraderMap[fagomrade]) {
          fagomraderMap[fagomrade] = {
            timer: 0,
            fag: [],
            displayName: this.fagomradeNavn[fagomrade] || fagomrade
          };
        }
        fagomraderMap[fagomrade].timer += timer;
        fagomraderMap[fagomrade].fag.push(fag.navn);
      });

      // Count fordypninger (fagområder with 2+ fag)
      let fordypninger = 0;
      let totalFordypningTimer = 0;
      const oppfylteOmrader = [];

      Object.entries(fagomraderMap).forEach(([fagomrade, data]) => {
        if (data.fag.length >= 2) {
          fordypninger++;
          totalFordypningTimer += data.timer;
          oppfylteOmrader.push(fagomrade);
        }
      });

      // Valider at alle fordypninger er fra samme STREA/STSSA-gruppe
      // Matematikk (MAT) er nøytral og "adopterer" gruppen til de andre fordypningene
      const gruppeValidering = this._validateFordypningSammeGruppe(oppfylteOmrader);

      // Check if fordypning requirement is met (use minOmrader from regler.yml)
      // Must also pass gruppe validation (all fordypninger from same STREA/STSSA group)
      const fordypningMet = fordypninger >= fordypningKrav.minOmrader && gruppeValidering.valid;

      result.fordypning = {
        totalTimer: totalFordypningTimer,
        fagomrader: fagomraderMap,
        fordypninger: fordypninger,
        requiredFordypninger: fordypningKrav.minOmrader,
        isMet: fordypningMet,
        gruppeValidering: gruppeValidering,
        gruppeError: gruppeValidering.message
      };

      // Add error if fordypning not met (insufficient count)
      if (fordypninger < fordypningKrav.minOmrader) {
        result.errors.push({
          type: 'fordypning-insufficient',
          message: `Fordypning: Du har ${fordypninger} fordypning(er), men trenger minst ${fordypningKrav.minOmrader} fordypninger`,
          details: `En fordypning = 2 fag fra samme fagområde. Du har fag fra ${Object.keys(fagomraderMap).length} fagområde(r).`,
          suggestion: 'Velg 2 fag fra samme fagområde for å oppnå en fordypning'
        });

        result.valid = false;
      }

      // Add error if fordypninger are from mixed STREA/STSSA groups
      if (!gruppeValidering.valid) {
        result.errors.push({
          type: 'fordypning-mixed-groups',
          message: gruppeValidering.message,
          details: 'Alle fordypninger må være fra samme programområde (enten realfag ELLER samfunn/språk). Matematikk er nøytral og kan kombineres med begge.',
          suggestion: 'Fjern fag fra én av gruppene, eller erstatt dem med fag fra den andre gruppen'
        });

        result.valid = false;
      }
    } // End of fordypning calculation (else block)

    // ========================================================================
    // 3. COMBINED PREREQUISITE WARNINGS
    // ========================================================================
    // Check prerequisites across VG2 and VG3
    // Example: Fysikk 2 in VG3 should have Fysikk 1 in VG2

    allSelections.forEach(fag => {
      const fagId = (fag.id || fag.fagkode).toLowerCase();
      const forutsetning = this.forutsetninger.find(f =>
        f.fag.some(id => id.toLowerCase() === fagId)
      );

      if (forutsetning) {
        // Check if prerequisite is met
        const prerequisiteMet = forutsetning.krever.some(krevId =>
          allFagIds.includes(krevId.toLowerCase())
        );

        if (!prerequisiteMet) {
          const prereqNames = forutsetning.krever.join(' eller ');
          result.warnings.push({
            type: 'missing-prerequisite',
            message: `${fag.navn} anbefales med ${prereqNames} som grunnlag`,
            fagId: fagId
          });
        }
      }
    });

    // ========================================================================
    // 4. SPANSK I+II VALIDATION (if applicable)
    // ========================================================================
    // Spansk I+II can only be selected if harFremmedsprak === false

    const hasSpansk = allFagIds.some(id =>
      id.includes('spansk-i-ii') || id.includes('spansk_i+ii')
    );

    if (hasSpansk && context.harFremmedsprak === true) {
      result.valid = false;
      result.errors.push({
        type: 'spansk-not-allowed',
        message: 'Spansk I+II kan kun velges hvis du IKKE hadde fremmedspråk på ungdomsskolen',
        suggestion: 'Endre filter til "Nei" for fremmedspråk, eller velg et annet fag'
      });
    }

    return result;
  }
}
