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
      trinn: 'vg1',  // Current level: 'vg1' or 'vg2' (determines blokkskjema version)
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

  /**
   * Set current trinn (VG1 or VG2)
   * This determines which blokkskjema version is used
   */
  setTrinn(trinn) {
    if (this.state.trinn !== trinn && (trinn === 'vg1' || trinn === 'vg2')) {
      this.state.trinn = trinn;
      this.notify();
    }
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
  // UNIFIED API - Replaces legacy setVG2Matematikk + setProgramfag
  // ==========================================================================

  /**
   * UNIFIED: Set all selections for a trinn (VG2/VG3)
   * Automatically assigns correct slots based on fag type
   *
   * @param {string} trinn - 'vg2' or 'vg3'
   * @param {Array} allSelections - Array of ALL fag from modal (including math/historie)
   *
   * Slot assignment:
   * - VG2: matematikk-* → slot 'matematikk', others → 'programfag-1/2/3'
   * - VG3: historie-vg3/HIS1010 → slot 'historie', others → 'programfag-1/2/3'
   */
  setTrinnSelections(trinn, allSelections) {
    const selections = [];

    // Helper functions for fag type detection
    const isMath = (fag) => {
      const id = (fag.id || '').toLowerCase();
      const fagkode = (fag.fagkode || '').toUpperCase();
      // Include all matematikk-programfag: R1, R2, S1, S2, 2P, Statistikk, Matematikk for økonomifag
      const matematikkIds = ['statistikk', 'matematikk-for-okonomifag'];
      return id.startsWith('matematikk') || fagkode.startsWith('MAT') || matematikkIds.includes(id);
    };

    const isHistorie = (fag) => {
      const id = (fag.id || '').toLowerCase();
      const fagkode = (fag.fagkode || '').toUpperCase();
      return id === 'historie-vg3' || fagkode === 'HIS1010';
    };

    // Sort: special fag first (matematikk for VG2, historie for VG3)
    const sortedFag = [...allSelections].sort((a, b) => {
      if (trinn === 'vg2') {
        if (isMath(a) && !isMath(b)) return -1;
        if (!isMath(a) && isMath(b)) return 1;
      } else if (trinn === 'vg3') {
        if (isHistorie(a) && !isHistorie(b)) return -1;
        if (!isHistorie(a) && isHistorie(b)) return 1;
      }
      return 0;
    });

    // Track if special slots are filled
    let specialSlotFilled = false;

    // Process each fag
    sortedFag.forEach((fag) => {
      // Determine slot based on fag type and trinn
      let slot;
      let type = 'programfag';

      if (trinn === 'vg2' && isMath(fag) && !specialSlotFilled) {
        slot = 'matematikk';
        type = 'programfag';
        specialSlotFilled = true;
      } else if (trinn === 'vg3' && isHistorie(fag) && !specialSlotFilled) {
        slot = 'historie';
        type = 'fellesfag';
        specialSlotFilled = true;
      } else {
        // Regular programfag - auto-increment slot number
        const programfagCount = selections.filter(s => s.slot?.startsWith('programfag-')).length;
        slot = `programfag-${programfagCount + 1}`;
        type = 'programfag';
      }

      // Add selection with all fields preserved
      selections.push({
        id: fag.id || fag.fagkode,
        navn: fag.navn,
        timer: fag.timer,
        fagkode: fag.fagkode,
        type: type,
        slot: slot,
        blokkId: fag.blokkId,  // IMPORTANT: Preserve blokkId!
        lareplan: fag.lareplan
      });
    });

    this.state[trinn].selections = selections;
    this.notify();
  }

  // ==========================================================================
  // BACKWARD COMPATIBILITY - Legacy API (still works, but use setTrinnSelections)
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
   * @deprecated Use setTrinnSelections() instead
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
      slot: 'matematikk',
      blokkId: matematikk.blokkId  // FIXED: Now preserves blokkId
    });
  }

  /**
   * @deprecated Use setTrinnSelections() instead
   */
  setProgramfag(trinn, programfag) {
    // Redirect to unified function for VG3
    // For VG2, still need to handle separately due to math being saved first
    if (trinn === 'vg3') {
      this.setTrinnSelections(trinn, programfag);
      return;
    }

    // VG2: preserve existing matematikk, add programfag
    const existingMath = this.getSelection('vg2', 'matematikk');
    const allSelections = existingMath ? [existingMath, ...programfag] : programfag;
    this.setTrinnSelections(trinn, allSelections);
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
   * Filter selections to only keep fag that exist in the given set of valid IDs.
   * Used when switching blokkskjema versions to remove invalid selections.
   * @param {string[]} validFagIds - Array of valid fag IDs
   * @returns {number} Number of selections that were removed
   */
  filterSelectionsToValidFag(validFagIds) {
    const validSet = new Set(validFagIds);
    let removedCount = 0;

    // Filter VG2 and VG3 selections (VG1 is not affected by blokkskjema)
    ['vg2', 'vg3'].forEach(trinn => {
      const before = this.state[trinn].selections.length;
      this.state[trinn].selections = this.state[trinn].selections.filter(
        sel => validSet.has(sel.id)
      );
      removedCount += before - this.state[trinn].selections.length;
    });

    if (removedCount > 0) {
      this.notify();
    }

    return removedCount;
  }

  /**
   * Get current state (deep copy to prevent external mutation)
   */
  getState() {
    // Deep copy to prevent consumers from mutating internal state
    return {
      trinn: this.state.trinn,
      programomrade: this.state.programomrade,
      harFremmedsprak: this.state.harFremmedsprak,
      vg1: {
        selections: this.state.vg1.selections.map(s => ({ ...s }))
      },
      vg2: {
        selections: this.state.vg2.selections.map(s => ({ ...s }))
      },
      vg3: {
        selections: this.state.vg3.selections.map(s => ({ ...s }))
      }
    };
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
    const vg2Required = this.getRequiredProgramfagCount('vg2');

    if (vg2Math && vg2Programfag.length === vg2Required) {
      validation.vg2Complete = true;
    } else {
      if (!vg2Math) {
        validation.errors.push('VG2: Matematikk ikke valgt');
      }
      if (vg2Programfag.length !== vg2Required) {
        validation.errors.push(`VG2: ${vg2Programfag.length}/${vg2Required} programfag valgt`);
      }
    }

    // VG3 validation
    // Historie er nå automatisk fellesfag (ikke en valgbar slot)
    const vg3Programfag = this.state.vg3.selections.filter(s => s.slot.startsWith('programfag-'));
    const vg3Required = this.getRequiredProgramfagCount('vg3');

    if (vg3Programfag.length === vg3Required) {
      validation.vg3Complete = true;
    } else {
      if (vg3Programfag.length !== vg3Required) {
        validation.errors.push(`VG3: ${vg3Programfag.length}/${vg3Required} programfag valgt`);
      }
    }

    validation.isComplete = validation.vg1Complete && validation.vg2Complete && validation.vg3Complete;

    return validation;
  }

  /**
   * Get required number of valgfrie programfag for a trinn
   * (excludes matematikk and historie which have special slots)
   */
  getRequiredProgramfagCount(trinn) {
    const programomrade = this.state.programomrade;

    if (programomrade === 'musikk-dans-drama') {
      return 1; // VG2 og VG3: 1 valgfritt programfag
    } else if (programomrade === 'medier-kommunikasjon') {
      return trinn === 'vg2' ? 1 : 2; // VG2: 1, VG3: 2
    }
    return 3; // Studiespesialisering: 3 valgfrie programfag
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
