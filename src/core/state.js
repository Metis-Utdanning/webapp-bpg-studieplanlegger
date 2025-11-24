/**
 * State Manager - Manages widget state
 *
 * REFACTORED (2024-11-24): Unified selections structure
 * - All trinn use selections[] array
 * - Each selection has: id, navn, timer, fagkode, type, slot
 * - Math included in programfag array with special slot
 */

export class StudieplanleggerState {
  constructor() {
    this.state = {
      // Filter state
      programomrade: 'studiespesialisering',
      harFremmedsprak: true,

      // UNIFIED SELECTION STRUCTURE
      vg1: {
        selections: [
          // e.g., { id: 'matematikk-1p', navn: 'Matematikk 1P', timer: 140, fagkode: 'MAT1019', type: 'fellesfag', slot: 'matematikk' }
          // e.g., { id: 'spansk-vg1', navn: 'Spansk nivå I', timer: 113, fagkode: 'FSP6218', type: 'fellesfag', slot: 'fremmedsprak' }
        ]
      },
      vg2: {
        selections: [
          // e.g., { id: 'matematikk-r1', navn: 'Matematikk R1', timer: 140, fagkode: 'MAT1024', type: 'programfag', slot: 'matematikk' }
          // e.g., { id: 'fysikk-1', navn: 'Fysikk 1', timer: 140, fagkode: 'FYS1002', type: 'programfag', slot: 'programfag-1' }
          // ... 3 more programfag with slots programfag-2, programfag-3
        ]
      },
      vg3: {
        selections: [
          // e.g., { id: 'historie-vg3', navn: 'Historie', timer: 113, fagkode: 'HIS1010', type: 'fellesfag', slot: 'historie' }
          // e.g., { id: 'fysikk-2', navn: 'Fysikk 2', timer: 140, fagkode: 'FYS1003', type: 'programfag', slot: 'programfag-1' }
          // ... 2-3 more programfag
        ]
      }
    };

    this.listeners = [];
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - Called when state changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of state change
   */
  notify() {
    this.listeners.forEach(callback => callback(this.state));
  }

  /**
   * Set programområde (clears programfag since they differ per program)
   */
  setProgramomrade(programomrade) {
    if (this.state.programomrade !== programomrade) {
      // Clear all selections when switching program (different blokkskjema)
      this.state.vg2.selections = [];
      this.state.vg3.selections = [];
    }
    this.state.programomrade = programomrade;
    this.notify();
  }

  /**
   * Set fremmedspråk status
   */
  setHarFremmedsprak(harFremmedsprak) {
    this.state.harFremmedsprak = harFremmedsprak;
    this.notify();
  }

  // ==========================================================================
  // NEW UNIFIED API - Works with selections[]
  // ==========================================================================

  /**
   * Set selection for a specific slot
   * @param {string} trinn - 'vg1', 'vg2', or 'vg3'
   * @param {string} slotName - Slot identifier (e.g., 'matematikk', 'programfag-1')
   * @param {Object} selection - Selection object with id, navn, timer, fagkode, type, slot
   */
  setSelection(trinn, slotName, selection) {
    const selections = this.state[trinn].selections;

    // Remove any existing selection for this slot
    const filtered = selections.filter(s => s.slot !== slotName);

    // Add new selection
    if (selection) {
      filtered.push({ ...selection, slot: slotName });
    }

    this.state[trinn].selections = filtered;
    this.notify();
  }

  /**
   * Set multiple selections for a trinn (replaces all)
   * @param {string} trinn - 'vg1', 'vg2', or 'vg3'
   * @param {Array} selections - Array of selection objects
   */
  setSelections(trinn, selections) {
    this.state[trinn].selections = selections.map(s => ({ ...s }));
    this.notify();
  }

  /**
   * Get all selections for a trinn
   * @param {string} trinn - 'vg1', 'vg2', or 'vg3'
   * @returns {Array} Array of selections
   */
  getSelections(trinn) {
    return [...this.state[trinn].selections];
  }

  /**
   * Get selection for a specific slot
   * @param {string} trinn - 'vg1', 'vg2', or 'vg3'
   * @param {string} slotName - Slot identifier
   * @returns {Object|null} Selection or null
   */
  getSelection(trinn, slotName) {
    return this.state[trinn].selections.find(s => s.slot === slotName) || null;
  }

  /**
   * Remove selection from a slot
   * @param {string} trinn - 'vg1', 'vg2', or 'vg3'
   * @param {string} slotName - Slot identifier
   */
  removeSelection(trinn, slotName) {
    this.state[trinn].selections = this.state[trinn].selections.filter(
      s => s.slot !== slotName
    );
    this.notify();
  }

  // ==========================================================================
  // BACKWARD COMPATIBILITY - Legacy API that maps to new structure
  // ==========================================================================

  /**
   * Set VG1 subject (LEGACY - maps to new structure)
   * @param {string} type - 'matematikk' or 'fremmedsprak'
   * @param {Object} subject - Subject object
   */
  setVG1Subject(type, subject) {
    if (!subject) {
      this.removeSelection('vg1', type);
      return;
    }

    this.setSelection('vg1', type, {
      id: subject.id || subject.fagkode,
      navn: subject.navn,
      timer: subject.timer,
      fagkode: subject.fagkode,
      type: 'fellesfag',
      slot: type
    });
  }

  /**
   * Set VG2 matematikk (LEGACY - maps to new structure)
   * @param {Object} matematikk - Matematikk object
   */
  setVG2Matematikk(matematikk) {
    if (!matematikk) {
      this.removeSelection('vg2', 'matematikk');
      return;
    }

    this.setSelection('vg2', 'matematikk', {
      id: matematikk.id || matematikk.fagkode,
      navn: matematikk.navn,
      timer: matematikk.timer,
      fagkode: matematikk.fagkode,
      type: 'programfag',
      slot: 'matematikk'
    });
  }

  /**
   * Set VG2/VG3 programfag (LEGACY - maps to new structure)
   * @param {string} trinn - 'vg2' or 'vg3'
   * @param {Array} programfag - Array of programfag objects
   */
  setProgramfag(trinn, programfag) {
    // Keep existing matematikk for VG2 if present
    const selections = [];

    if (trinn === 'vg2') {
      const math = this.getSelection('vg2', 'matematikk');
      if (math) {
        selections.push(math);
      }
    }

    // Keep existing historie for VG3 if present
    if (trinn === 'vg3') {
      const historie = this.getSelection('vg3', 'historie');
      if (historie) {
        selections.push(historie);
      }
    }

    // Add programfag with auto-assigned slots
    programfag.forEach((fag, index) => {
      // Skip if it's already a math or historie (handled above)
      const isMath = fag.slot === 'matematikk' || fag.fagkode?.startsWith('MAT');
      const isHistorie = fag.slot === 'historie' || fag.fagkode === 'HIS1010';

      if (isMath && trinn === 'vg2') {
        // Update math slot
        selections[0] = {
          id: fag.id || fag.fagkode,
          navn: fag.navn,
          timer: fag.timer,
          fagkode: fag.fagkode,
          type: 'programfag',
          slot: 'matematikk',
          blokkId: fag.blokkId // Preserve blokkId
        };
      } else if (isHistorie && trinn === 'vg3') {
        // Update historie slot
        selections[0] = {
          id: fag.id || fag.fagkode,
          navn: fag.navn,
          timer: fag.timer,
          fagkode: fag.fagkode,
          type: 'fellesfag',
          slot: 'historie',
          blokkId: fag.blokkId // Preserve blokkId
        };
      } else {
        // Regular programfag
        const slotIndex = selections.filter(s => s.slot.startsWith('programfag-')).length + 1;
        selections.push({
          id: fag.id || fag.fagkode,
          navn: fag.navn,
          timer: fag.timer,
          fagkode: fag.fagkode,
          type: fag.type || 'programfag',
          slot: fag.slot || `programfag-${slotIndex}`,
          blokkId: fag.blokkId // Preserve blokkId if present
        });
      }
    });

    this.state[trinn].selections = selections;
    this.notify();
  }

  // ==========================================================================
  // GETTERS - Backward compatible with legacy code
  // ==========================================================================

  /**
   * Get VG1 matematikk (LEGACY)
   */
  getVG1Matematikk() {
    return this.getSelection('vg1', 'matematikk');
  }

  /**
   * Get VG1 fremmedspråk (LEGACY)
   */
  getVG1Fremmedsprak() {
    return this.getSelection('vg1', 'fremmedsprak');
  }

  /**
   * Get VG2 matematikk (LEGACY)
   */
  getVG2Matematikk() {
    return this.getSelection('vg2', 'matematikk');
  }

  /**
   * Get VG2 programfag (LEGACY - excludes matematikk)
   */
  getVG2Programfag() {
    return this.state.vg2.selections.filter(s => s.slot.startsWith('programfag-'));
  }

  /**
   * Get VG3 programfag (LEGACY - includes all)
   */
  getVG3Programfag() {
    return [...this.state.vg3.selections];
  }

  /**
   * Get VG3 historie
   */
  getVG3Historie() {
    return this.getSelection('vg3', 'historie');
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Clear all fag selections (reset VG1, VG2, VG3)
   */
  clearAllSelections() {
    this.state.vg1.selections = [];
    this.state.vg2.selections = [];
    this.state.vg3.selections = [];
    this.notify();
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get all selected fag IDs across all trinn
   * @returns {Array<string>} Array of fag IDs
   */
  getAllSelectedFagIds() {
    const ids = [];
    ['vg1', 'vg2', 'vg3'].forEach(trinn => {
      this.state[trinn].selections.forEach(s => {
        ids.push(s.id);
      });
    });
    return ids;
  }

  /**
   * Validate current selections
   * @returns {Object} Validation results
   */
  validate() {
    const validation = {
      vg1Complete: false,
      vg2Complete: false,
      vg3Complete: false,
      errors: []
    };

    // VG1 validation
    const vg1Math = this.getSelection('vg1', 'matematikk');
    const vg1Fremmed = this.getSelection('vg1', 'fremmedsprak');

    if (vg1Math && vg1Fremmed) {
      validation.vg1Complete = true;
    } else {
      if (!vg1Fremmed) {
        validation.errors.push('VG1: Fremmedspråk ikke valgt');
      }
      if (!vg1Math) {
        validation.errors.push('VG1: Matematikk ikke valgt');
      }
    }

    // VG2 validation
    const vg2Math = this.getSelection('vg2', 'matematikk');
    const vg2Programfag = this.state.vg2.selections.filter(s => s.slot.startsWith('programfag-'));

    if (vg2Math && vg2Programfag.length === 3) {
      validation.vg2Complete = true;
    } else {
      if (!vg2Math) {
        validation.errors.push('VG2: Matematikk ikke valgt');
      }
      if (vg2Programfag.length !== 3) {
        validation.errors.push(`VG2: ${vg2Programfag.length}/3 programfag valgt`);
      }
    }

    // VG3 validation
    const vg3Historie = this.getSelection('vg3', 'historie');
    const vg3Programfag = this.state.vg3.selections.filter(s => s.slot.startsWith('programfag-'));

    if (vg3Historie && vg3Programfag.length === 3) {
      validation.vg3Complete = true;
    } else {
      if (!vg3Historie) {
        validation.errors.push('VG3: Historie må velges');
      }
      if (vg3Programfag.length !== 3) {
        validation.errors.push(`VG3: ${vg3Programfag.length}/3 programfag valgt`);
      }
    }

    validation.isComplete = validation.vg1Complete && validation.vg2Complete && validation.vg3Complete;

    return validation;
  }

  /**
   * Get required number of programfag for a trinn
   */
  getRequiredProgramfagCount(trinn) {
    // Studiespesialisering VG2: 4 fag total (1 matematikk + 3 programfag)
    // Studiespesialisering VG3: 4 fag total (1 historie + 3 programfag)
    if (this.state.programomrade === 'studiespesialisering') {
      if (trinn === 'vg2' || trinn === 'vg3') {
        return 4; // User selects 4 fag from blokkskjema
      }
    }
    return 3; // Default for now
  }

  /**
   * Calculate total hours for programfag
   */
  calculateProgramfagHours(trinn) {
    const selections = this.state[trinn].selections;
    return selections.reduce((total, fag) => {
      const hours = parseInt(fag.timer) || 0;
      return total + hours;
    }, 0);
  }
}
