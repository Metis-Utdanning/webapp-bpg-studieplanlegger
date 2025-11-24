/**
 * Studieplanlegger Widget - Main entry point
 */

import { DataHandler } from './core/data-handler.js';
import { StudieplanleggerState } from './core/state.js';
import { UIRenderer } from './ui/ui-renderer.js';
import { ValidationService } from './core/validation-service.js';

export class Studieplanlegger {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      schoolId: 'bergen-private-gymnas',
      ...options
    };

    this.dataHandler = new DataHandler({
      ...this.options,
      useMockData: false,
      apiVersion: 'v2'
    });
    this.state = new StudieplanleggerState();
    this.validator = new ValidationService();
    this.renderer = new UIRenderer(container, this.state, this.dataHandler);

    // Track selected fag in blokkskjema modal
    this.selectedBlokkskjemaFag = [];
    this.blokkskjemaModalSetup = false;

    this.init();
  }

  /**
   * Initialize the widget
   */
  async init() {
    try {
      // Set programområde on body for CSS
      document.body.setAttribute('data-programomrade', this.state.getState().programomrade);

      // Load data first (v2 API has regler embedded)
      await this.dataHandler.loadAll();

      // Initialize validator with regler from loaded data (v2 API)
      if (this.dataHandler.data && this.dataHandler.data.regler) {
        await this.validator.init(this.dataHandler.data.regler);
      } else {
        console.warn('⚠️ No regler found in data, validator will use fallback');
        await this.validator.init(null);
      }

      // Render initial UI
      this.renderer.render();

      // Attach event listeners
      this.attachEventListeners();

      // Subscribe to state changes
      this.state.subscribe((state) => {
        this.onStateChange(state);
      });

      console.log('Studieplanlegger initialized');
    } catch (error) {
      console.error('Failed to initialize Studieplanlegger:', error);
      this.container.innerHTML = '<p>Feil ved lasting av studieplanlegger. Prøv igjen senere.</p>';
    }
  }

  /**
   * Attach all event listeners
   */
  attachEventListeners() {
    // Filter buttons - Programområde
    this.container.querySelectorAll('[data-programomrade]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const programomrade = e.target.dataset.programomrade;
        this.state.setProgramomrade(programomrade);
      });
    });

    // Filter buttons - Fremmedspråk
    this.container.querySelectorAll('[data-fremmedsprak]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const harFremmedsprak = e.target.dataset.fremmedsprak === 'true';
        this.state.setHarFremmedsprak(harFremmedsprak);

        // Auto-populate Spansk I+II when "NEI" is selected, clear when "JA"
        if (!harFremmedsprak) {
          // Get Spansk I+II data from API (ikkeHarFremmedsprak)
          const spanskData = this.dataHandler.getVG1Fremmedsprak(false);
          if (spanskData && spanskData.length > 0) {
            this.state.setVG1Subject('fremmedsprak', spanskData[0]);
          }
        } else {
          // Clear the auto-populated Spansk I+II when switching back to "JA"
          this.state.setVG1Subject('fremmedsprak', null);
        }
      });
    });

    // Info buttons in main view - show fag details modal
    this.container.addEventListener('click', (e) => {
      const infoBtn = e.target.closest('.sp-fag-item-info');
      if (!infoBtn) return;

      e.preventDefault(); // Prevent default action
      e.stopPropagation(); // Prevent opening other modals
      e.stopImmediatePropagation(); // Stop all other handlers

      const fagId = infoBtn.dataset.fagId;
      if (fagId) {
        this.showFagDetails(fagId);
      }
    });

    // Fjern alle valg button
    this.container.querySelector('.sp-fjern-valg-btn')?.addEventListener('click', () => {
      // Clear all selections
      this.state.clearAllSelections();

      // Check if Spansk I+II was selected in VG1 or VG3
      const currentState = this.state.getState();

      // If Spansk I+II was removed but harFremmedsprak is false, reset filter to true
      // (Spansk is only needed when harFremmedsprak = false, so removing it means user has fremmedspråk)
      if (currentState.harFremmedsprak === false) {
        this.state.setHarFremmedsprak(true);

        // Update UI filter toggle
        const filterToggle = this.container.querySelector('.sp-toggle-input[value="fremmedsprak"]');
        if (filterToggle) {
          filterToggle.checked = true;
        }
      }
    });

    // VG1 slots - open modals
    this.container.querySelector('.sp-vg1-matematikk-slot')?.addEventListener('click', (e) => {
      // Don't open modal if clicking on info button
      if (e.target.closest('.sp-fag-item-info')) {
        return;
      }
      this.openVG1Modal('matematikk');
    });

    this.container.querySelector('.sp-vg1-fremmedsprak-slot')?.addEventListener('click', (e) => {
      // Don't open modal if clicking on info button
      if (e.target.closest('.sp-fag-item-info')) {
        return;
      }
      this.openVG1Modal('fremmedsprak');
    });

    // Programfag groups - open blokkskjema modal
    this.container.querySelectorAll('.sp-programfag-gruppe').forEach(gruppe => {
      gruppe.addEventListener('click', (e) => {
        // Don't open modal if clicking on info button
        if (e.target.closest('.sp-fag-item-info')) {
          return;
        }
        const trinn = gruppe.dataset.trinn;
        this.openBlokkskjemaModal(trinn);
      });
    });

    // VG2 Matematikk section - also opens blokkskjema modal for VG2
    this.container.querySelector('.sp-vg2-matematikk-gruppe')?.addEventListener('click', (e) => {
      // Don't open modal if clicking on info button
      if (e.target.closest('.sp-fag-item-info')) {
        return;
      }
      this.openBlokkskjemaModal('vg2');
    });

    // VG3 Historie section - opens blokkskjema modal for VG3
    this.container.querySelector('.sp-vg3-historie-gruppe')?.addEventListener('click', (e) => {
      // Don't open modal if clicking on info button
      if (e.target.closest('.sp-fag-item-info')) {
        return;
      }
      this.openBlokkskjemaModal('vg3');
    });

    // VG1 modals
    this.setupVG1Modal('matematikk');
    this.setupVG1Modal('fremmedsprak');

    // Blokkskjema modal
    this.setupBlokkskjemaModal();
  }

  /**
   * Handle state changes
   */
  onStateChange(state) {
    // Update body attribute for CSS
    document.body.setAttribute('data-programomrade', state.programomrade);

    // Reset modal setup flag (DOM elements are replaced on re-render)
    this.blokkskjemaModalSetup = false;

    // Re-render UI
    this.renderer.render();

    // Re-attach event listeners (since we re-rendered)
    this.attachEventListeners();
  }

  /**
   * Open VG1 modal (matematikk or fremmedspråk)
   */
  openVG1Modal(type) {
    const modal = this.container.querySelector(`.sp-modal-${type}`);
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * Close VG1 modal
   */
  closeVG1Modal(type) {
    const modal = this.container.querySelector(`.sp-modal-${type}`);
    if (modal) {
      modal.style.display = 'none';
      // Clear selection
      modal.querySelectorAll('.sp-vg1-fag-item').forEach(item => {
        item.classList.remove('selected');
      });
      // Reset button
      const btn = modal.querySelector('.sp-btn-primary');
      btn.disabled = true;
      btn.textContent = 'Velg fag';
    }
  }

  /**
   * Setup VG1 modal interactions
   */
  setupVG1Modal(type) {
    const modal = this.container.querySelector(`.sp-modal-${type}`);
    if (!modal) return;

    const closeBtn = modal.querySelector('.sp-modal-close');
    const cancelBtn = modal.querySelector('.sp-btn-secondary');
    const primaryBtn = modal.querySelector('.sp-btn-primary');
    const fagItems = modal.querySelectorAll('.sp-vg1-fag-item');

    let selectedFag = null;

    // Close modal
    closeBtn.addEventListener('click', () => this.closeVG1Modal(type));
    cancelBtn.addEventListener('click', () => this.closeVG1Modal(type));

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeVG1Modal(type);
    });

    // Fag selection
    fagItems.forEach(item => {
      item.addEventListener('click', () => {
        // Remove selection from all
        fagItems.forEach(f => f.classList.remove('selected'));

        // Select this item
        item.classList.add('selected');
        selectedFag = {
          navn: item.querySelector('.sp-vg1-fag-item-title').textContent,
          timer: item.dataset.timer,
          fagkode: item.dataset.fagkode,
          lareplan: item.dataset.lareplan
        };

        // Enable button
        primaryBtn.disabled = false;
        primaryBtn.textContent = `Velg ${selectedFag.navn}`;
      });
    });

    // Primary button - confirm selection
    primaryBtn.addEventListener('click', () => {
      if (selectedFag) {
        this.state.setVG1Subject(type, selectedFag);
        this.closeVG1Modal(type);
      }
    });
  }

  /**
   * Open blokkskjema modal for VG2/VG3
   */
  openBlokkskjemaModal(trinn) {
    const modal = this.container.querySelector('.sp-modal-blokkskjema');
    if (!modal) return;

    // Load current state
    const currentState = this.state.getState();

    // Restore existing selections from state using unified structure
    const existingFag = currentState[trinn]?.selections || [];
    this.selectedBlokkskjemaFag = existingFag.map(fag => ({
      id: fag.fagkode || fag.id,
      navn: fag.navn,
      timer: fag.timer,
      fagkode: fag.fagkode,
      blokkId: fag.blokkId // Preserve blokkId
    }));

    // Update modal title
    modal.querySelector('.sp-modal-title').textContent = `Velg programfag for ${trinn.toUpperCase()}`;

    // Load blokkskjema data (v2 API)
    const fagPerBlokk = this.dataHandler.getFagForProgramOgTrinn(currentState.programomrade, trinn);

    if (fagPerBlokk && Object.keys(fagPerBlokk).length > 0) {
      this.renderBlokkskjemaContent(fagPerBlokk);

      // Re-select existing fag in UI
      existingFag.forEach(fag => {
        const fagId = fag.id;  // use curriculum id
        const fagItem = modal.querySelector(`.sp-blokk-fag-item[data-id="${fagId}"]`);
        if (fagItem) {
          fagItem.classList.add('selected');
        }
      });

      // Auto-select Spansk I+II if harFremmedsprak === false (VG3)
      if (trinn === 'vg3' && currentState.harFremmedsprak === false) {
        const hasSpansk = this.selectedBlokkskjemaFag.some(f =>
          f.id === 'spansk-i-ii' || f.fagkode === 'FSP6237'
        );

        if (!hasSpansk) {
          // Auto-select Spansk I+II immediately when modal opens
          this.autoSelectFag(modal, 'spansk-i-ii');
        }
      }

      // Run initial validation to show selected-elsewhere hints
      this.updateBlokkValidation(modal);
    }

    // IMPORTANT: Set currentTrinn BEFORE calling updateModalButton
    modal.dataset.currentTrinn = trinn;

    // Update button with existing selection count
    const primaryBtn = modal.querySelector('.sp-btn-primary');
    this.updateModalButton(modal, primaryBtn);

    modal.style.display = 'flex';
  }

  /**
   * Close blokkskjema modal
   */
  closeBlokkskjemaModal() {
    const modal = this.container.querySelector('.sp-modal-blokkskjema');
    if (modal) {
      modal.style.display = 'none';
      modal.querySelectorAll('.sp-blokk-fag-item').forEach(item => {
        item.classList.remove('selected');
      });
    }
  }

  /**
   * Render blokkskjema content inside modal (v2 API structure)
   */
  renderBlokkskjemaContent(fagPerBlokk) {
    const container = this.container.querySelector('#blokkskjema-content');
    if (!container) return;

    // Get current state for validation
    const currentState = this.state.getState();

    // Helper to determine fordypning level from fag id (e.g., psykologi-1, fysikk-2)
    const getFordypningLevel = (fagId) => {
      if (fagId.endsWith('-1')) return '1';
      if (fagId.endsWith('-2')) return '2';
      return null;
    };

    const blocksHTML = Object.entries(fagPerBlokk).map(([blokkId, blokk]) => {
      // Sort fag: Historie VG3 first, then rest
      const sortedFag = [...blokk.fag].sort((a, b) => {
        if (a.id === 'historie-vg3') return -1;
        if (b.id === 'historie-vg3') return 1;
        return 0;
      });

      return `
      <div class="sp-blokk" data-blokk-id="${blokkId}">
        <div class="sp-blokk-header">${blokk.navn}</div>
        <div class="sp-blokk-fag-liste">
          ${sortedFag.map(f => {
            // Check if Spansk I+II should be blocked
            const isSpansk = f.id === 'spansk-i-ii' || f.fagkode === 'FSP6237';
            const shouldBlockSpansk = isSpansk && currentState.harFremmedsprak === true;
            const isObligatorisk = f.obligatorisk === true;
            const fordypningLevel = getFordypningLevel(f.id);
            const classes = ['sp-blokk-fag-item'];
            if (isObligatorisk) classes.push('obligatorisk');
            if (fordypningLevel) classes.push(`fordypning-${fordypningLevel}`);
            if (shouldBlockSpansk) classes.push('blocked');

            return `
            <div class="${classes.join(' ')}" data-id="${f.id}" data-fagkode="${f.fagkode || f.id}" data-timer="${f.timer}"${f.lareplan ? ` data-lareplan="${f.lareplan}"` : ''}${fordypningLevel ? ` data-fordypning="${fordypningLevel}"` : ''}>
              <div class="sp-blokk-fag-row">
                <span class="sp-blokk-fag-navn">${f.title || f.id}</span>
                <div class="sp-blokk-fag-right">
                  <span class="sp-blokk-fag-timer">${f.timer}t</span>
                  <button class="sp-fag-info-btn" data-fag-info="${f.id}" title="Se fagdetaljer" aria-label="Se detaljer for ${f.title || f.id}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
                    </svg>
                  </button>
                </div>
              </div>
              ${f.merknad ? `<div class="sp-blokk-fag-note">${f.merknad}</div>` : ''}
            </div>
          `}).join('')}
        </div>
      </div>
      `;
    }).join('');

    container.innerHTML = blocksHTML;
  }

  /**
   * Setup blokkskjema modal interactions
   */
  setupBlokkskjemaModal() {
    // Only setup once to avoid multiple event listeners
    if (this.blokkskjemaModalSetup) return;

    const modal = this.container.querySelector('.sp-modal-blokkskjema');
    if (!modal) return;

    const closeBtn = modal.querySelector('.sp-modal-close');
    const cancelBtn = modal.querySelector('.sp-btn-secondary');
    const primaryBtn = modal.querySelector('.sp-btn-primary');

    // Close modal
    closeBtn.addEventListener('click', () => this.closeBlokkskjemaModal());
    cancelBtn.addEventListener('click', () => this.closeBlokkskjemaModal());

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeBlokkskjemaModal();
    });

    // Fag selection (delegated event listener)
    // NEW APPROACH: Allow all selections, show validation errors, disable button if invalid
    modal.addEventListener('click', (e) => {
      const fagItem = e.target.closest('.sp-blokk-fag-item');
      if (!fagItem) return;

      // Block fag if marked as blocked by validation
      if (fagItem.classList.contains('blocked')) {
        // Shake animation
        fagItem.classList.add('shake');
        setTimeout(() => fagItem.classList.remove('shake'), 500);

        // Show error message from fagItem title (set by validation)
        const errorMessage = fagItem.title || 'Dette faget kan ikke velges';
        this.showModalValidationError(modal, errorMessage);
        return;
      }

      const blokk = fagItem.closest('.sp-blokk');
      const blokkId = blokk?.dataset.blokkId;
      const fagNavn = fagItem.querySelector('.sp-blokk-fag-navn').textContent;
      const fagTimer = fagItem.dataset.timer;
      const fagId = fagItem.dataset.id;  // curriculum id
      const fagKode = fagItem.dataset.fagkode;  // actual fagkode (e.g., HIS1010)
      const fagLareplan = fagItem.dataset.lareplan;

      // If already selected, deselect
      if (fagItem.classList.contains('selected')) {
        // SPECIAL CASE: Block deselecting Spansk I+II if harFremmedsprak = false
        const currentState = this.state.getState();
        const isSpansk = fagId.includes('spansk-i-ii') || fagId === 'FSP6237';

        if (isSpansk && currentState.harFremmedsprak === false) {
          // Shake animation
          fagItem.classList.add('shake');
          setTimeout(() => fagItem.classList.remove('shake'), 500);

          // Show error message
          this.showModalValidationError(
            modal,
            'Spansk I+II er obligatorisk når du ikke har fremmedspråk fra ungdomsskolen. Endre filter til "Ja" for å fjerne Spansk I+II.'
          );
          return;
        }

        // Deselect
        fagItem.classList.remove('selected');
        this.selectedBlokkskjemaFag = this.selectedBlokkskjemaFag.filter(f =>
          !(f.id === fagId && f.blokkId === blokkId)
        );
      } else {
        // Check if this fag is already selected in a DIFFERENT blokk - if so, deselect it there first (swap behavior)
        const existingSelection = this.selectedBlokkskjemaFag.find(f => f.id === fagId && f.blokkId !== blokkId);
        if (existingSelection) {
          // Remove from array
          this.selectedBlokkskjemaFag = this.selectedBlokkskjemaFag.filter(f =>
            !(f.id === fagId && f.blokkId === existingSelection.blokkId)
          );
          // Remove 'selected' class from the DOM element in the other blokk
          const otherBlokk = modal.querySelector(`.sp-blokk[data-blokk-id="${existingSelection.blokkId}"]`);
          otherBlokk?.querySelector(`.sp-blokk-fag-item[data-id="${fagId}"].selected`)?.classList.remove('selected');
        }

        // Deselect any other fag in same blokk (1 per blokk rule - swap)
        blokk?.querySelectorAll('.sp-blokk-fag-item.selected').forEach(item => {
          item.classList.remove('selected');
          const oldId = item.dataset.id;  // use curriculum id
          this.selectedBlokkskjemaFag = this.selectedBlokkskjemaFag.filter(f =>
            !(f.id === oldId && f.blokkId === blokkId)
          );
        });

        // Select this fag
        fagItem.classList.add('selected');
        this.selectedBlokkskjemaFag.push({
          navn: fagNavn,
          timer: fagTimer,
          fagkode: fagKode,  // actual fagkode (e.g., HIS1010)
          id: fagId,  // curriculum id (e.g., historie-vg3)
          blokkId,
          lareplan: fagLareplan
        });
      }

      // Check for auto-fill opportunities
      this.checkAutoFill(modal);

      // Update validation and button state
      this.updateBlokkValidation(modal);
      this.updateModalButton(modal, primaryBtn);
    });

    // Info button - show fag details modal
    modal.addEventListener('click', (e) => {
      const infoBtn = e.target.closest('.sp-fag-info-btn');
      if (!infoBtn) return;

      e.stopPropagation(); // Prevent fag selection when clicking info button
      const fagId = infoBtn.dataset.fagInfo;
      if (fagId) {
        this.showFagDetails(fagId);
      }
    });

    // Primary button - confirm selection
    primaryBtn.addEventListener('click', () => {
      const trinn = modal.dataset.currentTrinn;
      if (trinn && this.selectedBlokkskjemaFag.length > 0) {
        // For VG2, matematikk is required
        if (trinn === 'vg2') {
          const matematikkFag = this.selectedBlokkskjemaFag.find(f =>
            f.fagkode?.startsWith('matematikk') || f.id?.startsWith('matematikk')
          );
          const programfag = this.selectedBlokkskjemaFag.filter(f =>
            !f.fagkode?.startsWith('matematikk') && !f.id?.startsWith('matematikk')
          );

          // Validate: matematikk must be selected for VG2
          if (!matematikkFag) {
            this.showModalValidationError(modal, 'Du må velge matematikk for VG2!');
            return;
          }

          this.state.setVG2Matematikk(matematikkFag);
          this.state.setProgramfag(trinn, programfag);
        } else if (trinn === 'vg3') {
          // For VG3, validate minimum requirements
          const historieFag = this.selectedBlokkskjemaFag.find(f =>
            f.fagkode === 'HIS1010' || f.id === 'historie-vg3' || f.id?.includes('historie')
          );

          // Validate: historie must be selected for VG3
          if (!historieFag) {
            this.showModalValidationError(modal, 'Du må velge Historie for VG3!');
            return;
          }

          // Validate: Spansk I+II required if harFremmedsprak=false
          const currentState = this.state.getState();
          if (currentState.harFremmedsprak === false) {
            const spanskFag = this.selectedBlokkskjemaFag.find(f =>
              f.id === 'spansk-i-ii' || f.fagkode === 'FSP6237'
            );
            if (!spanskFag) {
              this.showModalValidationError(modal, 'Du må velge Spansk I+II siden du ikke hadde fremmedspråk på ungdomsskolen!');
              return;
            }
          }

          this.state.setProgramfag(trinn, this.selectedBlokkskjemaFag);
        } else {
          this.state.setProgramfag(trinn, this.selectedBlokkskjemaFag);
        }

        this.selectedBlokkskjemaFag = [];
        this.closeBlokkskjemaModal();
      }
    });

    this.blokkskjemaModalSetup = true;
  }

  /**
   * Show validation error in modal with shake animation
   */
  showModalValidationError(modal, message) {
    const content = modal.querySelector('.sp-modal-content');
    const validering = modal.querySelector('.sp-validering');

    // Update validation message
    if (validering) {
      validering.innerHTML = `
        <div class="sp-validering-items">
          <div class="sp-validering-item unmet">
            <div class="sp-validering-icon">!</div>
            <div class="sp-validering-text" style="color: #d32f2f;">${message}</div>
          </div>
        </div>
      `;
    }

    // Add shake animation
    if (content) {
      content.style.animation = 'none';
      content.offsetHeight; // Trigger reflow
      content.style.animation = 'shake 0.5s ease';

      // Add red border temporarily
      content.style.borderColor = '#d32f2f';
      setTimeout(() => {
        content.style.borderColor = '';
      }, 2000);
    }
  }

  /**
   * Update blokk validation - handles cross-blokk rules
   * Uses ValidationService for all validation logic
   */
  updateBlokkValidation(modal) {
    const currentTrinn = modal.dataset.currentTrinn;
    const currentState = this.state.getState();
    const allFagItems = modal.querySelectorAll('.sp-blokk-fag-item');
    this.blokkValidationErrors = [];

    // Clear previous validation states
    allFagItems.forEach(item => {
      item.classList.remove(
        'invalid-duplicate', 'invalid-math', 'missing-prerequisite',
        'selected-elsewhere', 'blocked', 'warning-state'
      );
      item.removeAttribute('title');
      const existingWarning = item.querySelector('.sp-prerequisite-warning');
      if (existingWarning) existingWarning.remove();
      const existingHint = item.querySelector('.sp-validation-hint');
      if (existingHint) existingHint.remove();
    });

    // Build map of selected fag per blokk
    const selectedPerBlokk = {};
    this.selectedBlokkskjemaFag.forEach(f => {
      if (!selectedPerBlokk[f.blokkId]) selectedPerBlokk[f.blokkId] = [];
      selectedPerBlokk[f.blokkId].push(f.id);
    });

    // Validate each fag item using ValidationService
    allFagItems.forEach(item => {
      const fagId = item.dataset.fagkode;
      const blokk = item.closest('.sp-blokk');
      const blokkId = blokk?.dataset.blokkId;

      if (!fagId) return;

      // Check if this fag is selected in THIS blokk
      const isSelectedHere = item.classList.contains('selected');

      // Check if selected in OTHER blokk
      const isSelectedElsewhere = this.selectedBlokkskjemaFag.some(
        f => f.id === fagId && f.blokkId !== blokkId
      );

      if (isSelectedElsewhere && !isSelectedHere) {
        item.classList.add('selected-elsewhere');
        item.title = 'Allerede valgt i annen blokk - klikk for å bytte';
        return;
      }

      // Check if there's a conflicting fag IN THE SAME BLOKK
      const hasConflictInSameBlokk = this.selectedBlokkskjemaFag.some(
        f => f.blokkId === blokkId && f.id !== fagId
      );

      // Use ValidationService for pre-selection validation
      const validation = this.validator.canSelectFag(
        fagId,
        currentState,
        currentTrinn,
        this.selectedBlokkskjemaFag
      );

      // Apply visual state based on validation
      // IMPORTANT: Don't block fag in same blokk as selected fag (allows swap)
      // Only block cross-blokk conflicts
      if (validation.status === 'blocked' && !isSelectedHere && !hasConflictInSameBlokk) {
        item.classList.add('blocked');
        // Include suggestion in tooltip if available
        const tooltip = validation.suggestion
          ? `${validation.reasons.join('\n')}\n\n💡 ${validation.suggestion}`
          : validation.reasons.join('\n');
        item.title = tooltip;
        this.addValidationHint(item, '🚫', validation.reasons[0]);
      } else if (validation.status === 'warning' && isSelectedHere) {
        item.classList.add('missing-prerequisite');
        const tooltip = validation.suggestion
          ? `${validation.reasons.join('\n')}\n\n💡 ${validation.suggestion}`
          : validation.reasons.join('\n');
        item.title = tooltip;
        this.addValidationHint(item, '⚠️', validation.reasons[0]);
      }

      // Check if selected fag creates errors
      if (isSelectedHere) {
        const modalValidation = this.validator.validateModalSelection(
          this.selectedBlokkskjemaFag,
          currentState,
          currentTrinn
        );

        // Mark math conflicts
        if (modalValidation.errors.some(e => e.type === 'math-conflict')) {
          const isMathFag = fagId.includes('matematikk-');
          if (isMathFag) {
            item.classList.add('invalid-math');
          }
        }

        // Mark duplicates
        const dupError = modalValidation.errors.find(e => e.type === 'duplicate');
        if (dupError && dupError.fagIds?.includes(fagId)) {
          item.classList.add('invalid-duplicate');
        }
      }
    });

    // Collect errors from modal validation
    const modalValidation = this.validator.validateModalSelection(
      this.selectedBlokkskjemaFag,
      currentState,
      currentTrinn
    );

    modalValidation.errors.forEach(err => {
      // Store full error object to preserve suggestion
      this.blokkValidationErrors.push({
        message: err.message,
        suggestion: err.suggestion || null,
        type: err.type
      });
    });

    // ==========================================================================
    // CROSS-TRINN VALIDATION (VG3 modal only)
    // ==========================================================================
    // When in VG3 modal, validate against VG2 selections for:
    // - Cross-trinn math conflicts (R1 VG2 + S1 VG3)
    // - Fordypning requirements (560t from 2+ fagområder)
    if (currentTrinn === 'vg3') {
      const vg2Selections = currentState.vg2?.selections || [];

      // Create temp VG3 selections by combining saved + current modal selections
      const savedVg3 = currentState.vg3?.selections || [];
      const tempVg3Selections = [...savedVg3, ...this.selectedBlokkskjemaFag];

      // Run cross-trinn validation
      const crossTrinnValidation = this.validator.validateCombinedSelections(
        vg2Selections,
        tempVg3Selections,
        {
          programomrade: currentState.programomrade,
          harFremmedsprak: currentState.harFremmedsprak
        }
      );

      // Add cross-trinn errors to validation errors
      crossTrinnValidation.errors.forEach(err => {
        this.blokkValidationErrors.push({
          message: err.message,
          suggestion: err.suggestion || null,
          type: err.type
        });
      });

      // Store fordypning result for display
      this.crossTrinnFordypning = crossTrinnValidation.fordypning;

      // Mark VG3 math fag as blocked if cross-trinn conflict exists
      const mathConflict = crossTrinnValidation.errors.find(
        e => e.type === 'cross-trinn-math-conflict'
      );
      if (mathConflict && mathConflict.fagIds) {
        allFagItems.forEach(item => {
          const fagId = item.dataset.fagkode?.toLowerCase();
          if (mathConflict.fagIds.includes(fagId)) {
            item.classList.add('blocked');
            item.title = mathConflict.message + '\n\n💡 ' + mathConflict.suggestion;
            this.addValidationHint(item, '🚫', mathConflict.message);
          }
        });
      }
    } else {
      // Clear cross-trinn fordypning when not in VG3
      this.crossTrinnFordypning = null;
    }

    // Update validation display with fordypning status
    this.updateValidationDisplay(modal);
  }

  /**
   * Add a small validation hint to a fag item
   */
  addValidationHint(item, icon, text) {
    const fagRow = item.querySelector('.sp-blokk-fag-row');
    if (!fagRow || item.querySelector('.sp-validation-hint')) return;

    const hint = document.createElement('span');
    hint.className = 'sp-validation-hint';
    hint.innerHTML = icon;
    hint.title = text;
    hint.style.cssText = 'margin-left: 6px; cursor: help; font-size: 0.9em;';
    fagRow.appendChild(hint);
  }

  /**
   * Update validation error display in modal
   * Shows errors AND fordypning progress
   */
  updateValidationDisplay(modal) {
    let validering = modal.querySelector('.sp-validering');
    const currentState = this.state.getState();

    if (!validering) {
      // Create validation area if it doesn't exist
      const blokkContent = modal.querySelector('#blokkskjema-content');
      if (blokkContent) {
        validering = document.createElement('div');
        validering.className = 'sp-validering';
        blokkContent.parentNode.insertBefore(validering, blokkContent);
      }
    }

    if (!validering) return;

    // Get fordypning status (use cross-trinn when available, otherwise old method)
    const currentTrinn = modal.dataset.currentTrinn || 'vg2';
    let fordypningData = null;

    if (currentTrinn === 'vg3' && this.crossTrinnFordypning) {
      // Use cross-trinn fordypning (VG2 + VG3 combined)
      fordypningData = this.crossTrinnFordypning;
    } else {
      // Fallback to old method (single trinn)
      const tempState = this.createTempStateWithModalSelections(currentState);
      const oldFordypning = this.validator.getFordypningStatus(tempState);

      // Convert getFordypningStatus format to validateCombinedSelections format
      const fagomraderMap = {};
      oldFordypning.areas?.forEach(area => {
        fagomraderMap[area.code] = {
          timer: area.timer,
          fag: area.fag || [],
          displayName: area.name
        };
      });

      fordypningData = {
        totalTimer: oldFordypning.totalTimer,
        requiredTimer: oldFordypning.required,
        fagomrader: fagomraderMap,
        fordypninger: oldFordypning.antallFordypninger || 0,
        requiredFordypninger: 2,
        isMet: oldFordypning.isValid
      };
    }

    // Build validation display HTML
    let html = '';

    // Fordypning progress (always show for studiespesialisering)
    // NEW LOGIC (2024-11-24): 1 fordypning = 2 fag from same fagområde, need 2 fordypninger total
    if (currentState.programomrade?.includes('studiespesialisering') && fordypningData) {
      const antallFordypninger = fordypningData.fordypninger || 0;
      const progress = Math.min(100, (antallFordypninger / 2) * 100);
      const progressColor = fordypningData.isMet ? '#4CAF50' : (progress > 50 ? '#ff9800' : '#d32f2f');

      // Show cross-trinn fordypning as fag blocks (2 side by side)
      const fagomraderBlokker = Object.entries(fordypningData.fagomrader || {})
        .map(([omrade, data], index) => {
          const isFordypning = data.fag.length >= 2;  // 2+ fag = fordypning
          // Different green shades for each fordypning område
          const greenShades = ['#4CAF50', '#66BB6A', '#81C784', '#A5D6A7'];
          const color = greenShades[index % greenShades.length];

          return `
            <div class="sp-fordypning-blokk ${isFordypning ? 'complete' : ''}" style="border-left-color: ${color};">
              <div class="sp-fordypning-blokk-header" style="${isFordypning ? `background: ${color}20; color: ${color}; border-bottom-color: ${color};` : ''}">
                ${isFordypning ? '✓' : ''} ${data.displayName || omrade} (${data.fag.length} fag)
              </div>
              <div class="sp-fordypning-blokk-fag">
                ${data.fag.join(', ')} <span style="opacity: 0.6; font-size: 0.85em;">(${data.timer}t)</span>
              </div>
            </div>
          `;
        }).join('');

      // For VG3, wrap fordypning and VG2 selections in a grid
      if (currentTrinn === 'vg3') {
        // Collect all VG2 fag including matematikk (from unified selections array)
        const vg2Fag = [];
        if (currentState.vg2?.selections && currentState.vg2.selections.length > 0) {
          // Get all VG2 selections (matematikk + programfag)
          vg2Fag.push(...currentState.vg2.selections.map(f => f.navn));
        }

        html += `<div class="sp-modal-info-grid">`;

        // VG2 selections (left)
        if (vg2Fag.length > 0) {
          html += `
            <div class="sp-vg2-selections">
              <span class="sp-vg2-text">📚 Dine programfag fra VG2:</span>
              <div class="sp-vg2-fag-tags">
                ${vg2Fag.map(navn => `<span class="sp-vg2-fag-tag">${navn}</span>`).join('')}
              </div>
            </div>
          `;
        }

        // Fordypning (right)
        html += `
          <div class="sp-fordypning-status">
            <div class="sp-fordypning-header">
              <span class="sp-fordypning-label">📊 Fordypning: ${antallFordypninger} av 2 fordypninger</span>
              <span class="sp-fordypning-progress" style="color: ${progressColor}">
                ${fordypningData.isMet ? '✓' : '✗'}
              </span>
            </div>
            ${fagomraderBlokker ? `
              <div class="sp-fordypning-blokker-grid">
                ${fagomraderBlokker}
              </div>
            ` : `
              <div class="sp-fordypning-hint">
                2 fag fra samme fagområde = 1 fordypning. Trenger 2 fordypninger totalt.
              </div>
            `}
          </div>
        `;

        html += `</div>`;
      } else {
        // For VG2, just show fordypning without grid
        html += `
          <div class="sp-fordypning-status">
            <div class="sp-fordypning-header">
              <span class="sp-fordypning-label">📊 Fordypning: ${antallFordypninger} av 2 fordypninger</span>
              <span class="sp-fordypning-progress" style="color: ${progressColor}">
                ${fordypningData.isMet ? '✓ Oppfylt' : 'Ikke oppfylt'}
              </span>
            </div>
            ${fagomraderBlokker ? `
              <div class="sp-fordypning-blokker-grid">
                ${fagomraderBlokker}
              </div>
            ` : `
              <div class="sp-fordypning-hint">
                2 fag fra samme fagområde = 1 fordypning. Trenger 2 fordypninger totalt.
              </div>
            `}
          </div>
        `;
      }
    }

    // Validation errors
    if (this.blokkValidationErrors.length > 0) {
      html += `
        <div class="sp-validering-errors">
          <div class="sp-validering-title">⚠️ Valideringsfeil:</div>
          <div class="sp-validering-items">
            ${this.blokkValidationErrors.map(err => {
              const message = typeof err === 'string' ? err : err.message;
              const suggestion = typeof err === 'object' ? err.suggestion : null;
              return `
                <div class="sp-validering-item unmet">
                  <div class="sp-validering-icon">!</div>
                  <div class="sp-validering-content">
                    <div class="sp-validering-text">${message}</div>
                    ${suggestion ? `<div class="sp-validering-suggestion">💡 ${suggestion}</div>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Show/hide validation area
    if (html) {
      validering.innerHTML = html;
      validering.style.display = 'block';
    } else {
      validering.style.display = 'none';
    }
  }

  /**
   * Create a temporary state object that includes current modal selections
   * Used for preview calculations (fordypning, etc.)
   */
  createTempStateWithModalSelections(currentState) {
    const currentTrinn = document.querySelector('.sp-modal-blokkskjema')?.dataset?.currentTrinn || 'vg2';

    // Deep clone state
    const tempState = JSON.parse(JSON.stringify(currentState));

    // Add modal selections to appropriate trinn (using unified selections[] structure)
    if (currentTrinn === 'vg2') {
      tempState.vg2.selections = [...(tempState.vg2.selections || []), ...this.selectedBlokkskjemaFag];
    } else {
      tempState.vg3.selections = [...(tempState.vg3.selections || []), ...this.selectedBlokkskjemaFag];
    }

    return tempState;
  }

  /**
   * Update modal button state based on selection count and validation
   */
  updateModalButton(modal, primaryBtn) {
    const currentTrinn = modal.dataset.currentTrinn;
    const currentState = this.state.getState();
    const valgregler = this.dataHandler.getValgreglerForTrinn(currentState.programomrade, currentTrinn);

    // VG2: minAntallFag (3 programfag) + 1 matematikk = 4 total
    // VG3: minAntallFag ALREADY includes historie (4 total)
    // Note: valgregler.minAntallFag is different between VG2 (3) and VG3 (4)
    const required = currentTrinn === 'vg2'
      ? (valgregler?.minAntallFag || 3) + 1  // VG2: 3 programfag + 1 matematikk
      : (valgregler?.minAntallFag || 3);     // VG3: already includes historie

    const count = this.selectedBlokkskjemaFag.length;
    const hasErrors = this.blokkValidationErrors && this.blokkValidationErrors.length > 0;

    // Disable if count is wrong OR if there are validation errors
    primaryBtn.disabled = count !== required || hasErrors;

    if (hasErrors) {
      primaryBtn.textContent = `Rett opp feil (${count}/${required} fag)`;
    } else {
      primaryBtn.textContent = `Legg til (${count}/${required} fag)`;
    }
  }

  /**
   * Check for auto-fill opportunities for obligatory fag
   * Auto-selects Historie (VG3) or Spansk I+II (VG2/VG3 when fremmedsprak=NEI)
   */
  checkAutoFill(modal) {
    const currentTrinn = modal.dataset.currentTrinn;
    const currentState = this.state.getState();
    const valgregler = this.dataHandler.getValgreglerForTrinn(currentState.programomrade, currentTrinn);

    // Calculate required count and remaining slots
    // VG2: minAntallFag (3) + 1 matematikk = 4 total
    // VG3: minAntallFag (4) already includes historie
    const required = currentTrinn === 'vg2'
      ? (valgregler?.minAntallFag || 3) + 1  // VG2: 3 programfag + 1 matematikk
      : (valgregler?.minAntallFag || 3);     // VG3: already includes historie
    const currentCount = this.selectedBlokkskjemaFag.length;
    const remaining = required - currentCount;

    // VG3: Auto-fill Historie when 1 slot remaining
    if (currentTrinn === 'vg3' && remaining === 1) {
      const hasHistorie = this.selectedBlokkskjemaFag.some(f =>
        f.id?.includes('historie') || f.fagkode?.includes('historie')
      );

      if (!hasHistorie) {
        this.autoSelectFag(modal, 'historie');
      }
    }

    // VG2/VG3: Auto-fill Spansk I+II when fremmedsprak=NEI and 2 slots remaining
    if ((currentTrinn === 'vg2' || currentTrinn === 'vg3') &&
        currentState.harFremmedsprak === false &&
        remaining === 2) {
      const hasSpansk = this.selectedBlokkskjemaFag.some(f =>
        f.id === 'spansk-i-ii' || f.fagkode === 'FSP6237'
      );

      if (!hasSpansk) {
        // Use exact ID match for Spansk I+II
        this.autoSelectFag(modal, 'spansk-i-ii');
      }
    }
  }

  /**
   * Programmatically auto-select a fag by partial match
   */
  autoSelectFag(modal, fagPattern) {
    // Find the fag item matching the pattern (use data-id)
    const fagItem = modal.querySelector(`.sp-blokk-fag-item[data-id*="${fagPattern}"]`);
    if (!fagItem || fagItem.classList.contains('selected')) return;

    const blokk = fagItem.closest('.sp-blokk');
    const blokkId = blokk?.dataset.blokkId;

    // Deselect other fag in same blokk first
    blokk?.querySelectorAll('.sp-blokk-fag-item.selected').forEach(item => {
      item.classList.remove('selected');
      const oldId = item.dataset.id;  // use curriculum id
      this.selectedBlokkskjemaFag = this.selectedBlokkskjemaFag.filter(f =>
        !(f.id === oldId && f.blokkId === blokkId)
      );
    });

    // Select the fag
    fagItem.classList.add('selected');
    const fagNavn = fagItem.querySelector('.sp-blokk-fag-navn').textContent;
    const fagTimer = fagItem.dataset.timer;
    const fagId = fagItem.dataset.id;  // curriculum id
    const fagKode = fagItem.dataset.fagkode;  // actual fagkode
    const fagLareplan = fagItem.dataset.lareplan;

    this.selectedBlokkskjemaFag.push({
      navn: fagNavn,
      timer: fagTimer,
      fagkode: fagKode,  // actual fagkode (e.g., HIS1010)
      id: fagId,  // curriculum id (e.g., historie-vg3)
      blokkId,
      lareplan: fagLareplan
    });

    // Update validation and button state after auto-select
    const primaryBtn = modal.querySelector('.sp-btn-primary');
    this.updateBlokkValidation(modal);
    this.updateModalButton(modal, primaryBtn);
  }

  /**
   * Show fag details in modal (programfag-info modal)
   * @param {string} fagId - Subject ID
   */
  showFagDetails(fagId) {
    // Use v2 API data (already loaded in this.dataHandler.data.curriculum)
    // v2 has: omFaget (simple text description)
    // v1 has: beskrivelseHTML, bilde, vimeo, kompetansemål (full markdown) - could be added later

    if (!this.dataHandler.data || !this.dataHandler.data.curriculum) {
      console.error('Curriculum data not loaded yet');
      return;
    }

    const curriculum = this.dataHandler.data.curriculum;
    let fag = null;

    // Search in valgfrieProgramfag
    if (curriculum.valgfrieProgramfag) {
      fag = curriculum.valgfrieProgramfag.find(f => f.id === fagId);
    }

    // Search in obligatoriskeProgramfag if not found
    if (!fag && curriculum.obligatoriskeProgramfag) {
      fag = curriculum.obligatoriskeProgramfag.find(f => f.id === fagId);
    }

    // Search in fellesfag if not found
    if (!fag && curriculum.fellesfag) {
      fag = curriculum.fellesfag.find(f => f.id === fagId);
    }

    if (fag) {
      this.renderFagModal(fag);
    } else {
      console.error('Fag not found:', fagId, 'Available:', {
        valgfrie: curriculum.valgfrieProgramfag?.length,
        obligatoriske: curriculum.obligatoriskeProgramfag?.length,
        fellesfag: curriculum.fellesfag?.length
      });
    }
  }

  /**
   * Render fag details modal
   * @param {Object} fag - Subject data
   */
  renderFagModal(fag) {
    let modal = document.getElementById('programfag-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'programfag-modal';
      modal.className = 'programfag-modal';
      document.body.appendChild(modal);
    }

    // Image if available (v1 only - not in v2)
    const bildeHTML = fag.bilde
      ? `<div class="fag-bilde">
          <img src="${fag.bilde}" alt="${fag.title}" />
        </div>`
      : '';

    // Vimeo video if available (v1 only - not in v2)
    const vimeoHTML = fag.vimeo
      ? `<div class="vimeo-container">
          <iframe
            src="https://player.vimeo.com/video/${this.extractVimeoId(fag.vimeo)}"
            frameborder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>`
      : '';

    // Related subjects (fordypning)
    const relatedHTML = fag.related && fag.related.length > 0
      ? `<p class="related-info">Fordypning oppnås i lag med: <span class="related-badge-large">${fag.related.join(', ')}</span></p>`
      : '';

    // Use beskrivelseHTML from v2 API (full markdown HTML with all sections)
    const beskrivelseHTML = fag.beskrivelseHTML || fag.omFaget || '<p>Ingen beskrivelse tilgjengelig.</p>';

    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="window.studieplanlegger.closeFagModal()">&times;</button>
        <h2>${fag.title}</h2>
        <p class="fagkode-large">${fag.fagkode}</p>
        ${relatedHTML}

        ${bildeHTML}
        ${vimeoHTML}

        <div class="modal-body">
          ${beskrivelseHTML}
        </div>

        <a href="https://sokeresultat.udir.no/finn-lareplan.html?query=${fag.fagkode}&source=Laereplan&fltypefiltermulti=L%C3%A6replan&filtervalues=all" target="_blank" class="btn-lareplan">Se full læreplan på udir.no →</a>
      </div>
    `;

    // Insert HTML content separately to avoid escaping
    const beskrivelseDiv = modal.querySelector('.om-faget');
    if (beskrivelseDiv) {
      beskrivelseDiv.innerHTML = fag.beskrivelseHTML || fag.beskrivelse || '';
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Convert competency goals to accordion
    this.makeCompetencyAccordion(modal);

    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.closeFagModal();
      }
    };
  }

  /**
   * Extract Vimeo ID from URL
   * @param {string} vimeoUrl - Vimeo URL
   * @returns {string} - Vimeo video ID
   */
  extractVimeoId(vimeoUrl) {
    const match = vimeoUrl.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : '';
  }

  /**
   * Convert competency goals section to accordion
   * @param {HTMLElement} modal - Modal element
   */
  makeCompetencyAccordion(modal) {
    const modalBody = modal.querySelector('.modal-body');
    if (!modalBody) return;

    // Find all h2 headers in the content
    const headers = modalBody.querySelectorAll('h2');

    headers.forEach(header => {
      const headerText = header.textContent.trim();

      // Check if this is "Kompetansemål" (exact match)
      if (headerText === 'Kompetansemål') {
        // Get the next sibling (should be <ul>)
        const list = header.nextElementSibling;

        if (list && list.tagName === 'UL') {
          const itemCount = list.querySelectorAll('li').length;

          // Create accordion wrapper
          const accordion = document.createElement('div');
          accordion.className = 'accordion';

          // Create accordion header
          const accordionHeader = document.createElement('div');
          accordionHeader.className = 'accordion-header';
          accordionHeader.innerHTML = `
            <h3>I dette faget lærer du å ... <span class="accordion-count">(${itemCount})</span></h3>
            <span class="accordion-icon">▼</span>
          `;
          accordionHeader.onclick = () => {
            accordion.classList.toggle('open');
          };

          // Create accordion content
          const accordionContent = document.createElement('div');
          accordionContent.className = 'accordion-content';
          accordionContent.appendChild(list.cloneNode(true));

          // Build accordion
          accordion.appendChild(accordionHeader);
          accordion.appendChild(accordionContent);

          // Replace h2 and ul with accordion
          header.parentNode.insertBefore(accordion, header);
          header.remove();
          list.remove();
        }
      }
    });
  }

  /**
   * Close fag modal
   */
  closeFagModal() {
    const modal = document.getElementById('programfag-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
}
