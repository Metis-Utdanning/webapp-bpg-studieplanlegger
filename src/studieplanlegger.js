/**
 * Studieplanlegger Widget - Main entry point
 */

import { DataHandler } from './core/data-handler.js';
import { StudieplanleggerState } from './core/state.js';
import { UIRenderer } from './ui/ui-renderer.js';
import { ValidationService } from './core/validation-service.js';

/**
 * Sanitize string for safe HTML insertion (XSS protection)
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class Studieplanlegger {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      schoolId: 'bergen-private-gymnas',
      showVersionSwitcher: false,  // Show blokkskjema version switcher
      defaultBlokkskjemaVersion: null,  // Override default version from API
      ...options
    };

    this.dataHandler = new DataHandler({
      ...this.options,
      useMockData: false,
      apiVersion: 'v2'
    });
    this.state = new StudieplanleggerState();
    this.validator = new ValidationService();
    this.renderer = new UIRenderer(container, this.state, this.dataHandler, this.options);

    // Track selected fag in blokkskjema modal
    this.selectedBlokkskjemaFag = [];
    this.blokkskjemaModalSetup = false;

    // AbortController for modal event listeners (enables cleanup)
    this.modalAbortController = null;

    // AbortController for version switcher listeners (enables cleanup)
    this.versionSwitcherAbortController = null;

    this.init();
  }

  /**
   * Cleanup method - call when destroying the widget
   */
  destroy() {
    // Abort all modal event listeners
    if (this.modalAbortController) {
      this.modalAbortController.abort();
      this.modalAbortController = null;
    }

    // Abort version switcher event listeners
    if (this.versionSwitcherAbortController) {
      this.versionSwitcherAbortController.abort();
      this.versionSwitcherAbortController = null;
    }

    // Unsubscribe from state changes
    if (this.stateUnsubscribe) {
      this.stateUnsubscribe();
      this.stateUnsubscribe = null;
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    console.log('🧹 Studieplanlegger destroyed');
  }

  /**
   * Initialize blokkskjema version based on priority:
   * 1. URL parameter (?blokkskjema=v1)
   * 2. localStorage (persisted choice)
   * 3. Constructor option (defaultBlokkskjemaVersion)
   * 4. API default (activeVersion from school-config)
   */
  initBlokkskjemaVersion() {
    const availableVersions = this.dataHandler.getAvailableVersions();

    if (availableVersions.length === 0) {
      console.warn('⚠️ No blokkskjema versions available');
      return;
    }

    // Priority 1: URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlVersion = urlParams.get('blokkskjema');

    if (urlVersion && availableVersions.includes(urlVersion)) {
      this.dataHandler.setBlokkskjemaVersion(urlVersion);
      console.log(`📋 Blokkskjema version from URL: ${urlVersion}`);
      return;
    }

    // Priority 2: localStorage
    const storedVersion = localStorage.getItem('studieplanlegger_blokkskjema_version');
    if (storedVersion && availableVersions.includes(storedVersion)) {
      this.dataHandler.setBlokkskjemaVersion(storedVersion);
      console.log(`📋 Blokkskjema version from localStorage: ${storedVersion}`);
      return;
    }

    // Priority 3: Constructor option
    if (this.options.defaultBlokkskjemaVersion &&
        availableVersions.includes(this.options.defaultBlokkskjemaVersion)) {
      this.dataHandler.setBlokkskjemaVersion(this.options.defaultBlokkskjemaVersion);
      console.log(`📋 Blokkskjema version from options: ${this.options.defaultBlokkskjemaVersion}`);
      return;
    }

    // Priority 4: API default (already set by DataHandler)
    console.log(`📋 Using default blokkskjema version: ${this.dataHandler.getActiveVersion()}`);
  }

  /**
   * Check for admin mode (enables version switcher)
   * Activated by URL parameter: ?admin=true or ?blokkskjema=*
   */
  checkAdminMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    const hasBlokkskjemaParam = urlParams.has('blokkskjema');

    console.log('🔍 checkAdminMode:', { isAdmin, hasBlokkskjemaParam, search: window.location.search });

    if (isAdmin || hasBlokkskjemaParam) {
      this.options.showVersionSwitcher = true;
      // Also update renderer's reference directly to be safe
      if (this.renderer && this.renderer.options) {
        this.renderer.options.showVersionSwitcher = true;
      }
      console.log('🔧 Admin mode activated - version switcher enabled');
    }
  }

  /**
   * Switch to a different blokkskjema version
   * @param {string} versionId - Version to switch to
   */
  switchBlokkskjemaVersion(versionId) {
    const success = this.dataHandler.setBlokkskjemaVersion(versionId);

    if (!success) {
      console.error(`Failed to switch to version: ${versionId}`);
      return;
    }

    // Filter out selections that don't exist in new version
    const validFagIds = this.dataHandler.getAllFagIds(versionId);
    this.state.filterSelectionsToValidFag(validFagIds);

    // Save choice to localStorage
    localStorage.setItem('studieplanlegger_blokkskjema_version', versionId);

    // Reset modal setup flag (DOM elements are replaced on re-render)
    this.blokkskjemaModalSetup = false;

    // Re-render UI
    this.renderer.render();
    this.attachEventListeners();

    console.log(`✅ Switched to blokkskjema version: ${versionId}`);
  }

  /**
   * Attach event listeners for version switcher
   */
  attachVersionSwitcherListeners() {
    const switcher = this.container.querySelector('.sp-version-switcher');
    if (!switcher) return;

    const btn = switcher.querySelector('.sp-version-btn');
    const dropdown = switcher.querySelector('.sp-version-dropdown');

    if (!btn || !dropdown) return;

    // Abort previous listeners to prevent memory leak on re-render
    if (this.versionSwitcherAbortController) {
      this.versionSwitcherAbortController.abort();
    }
    this.versionSwitcherAbortController = new AbortController();
    const { signal } = this.versionSwitcherAbortController;

    // Toggle dropdown on button click
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !dropdown.classList.contains('hidden');

      if (isOpen) {
        dropdown.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      } else {
        dropdown.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
      }
    }, { signal });

    // Handle version selection
    dropdown.querySelectorAll('.sp-version-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const version = e.currentTarget.dataset.version;
        dropdown.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');

        if (version && version !== this.dataHandler.getActiveVersion()) {
          this.switchBlokkskjemaVersion(version);
        }
      }, { signal });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!switcher.contains(e.target)) {
        dropdown.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      }
    }, { signal });

    // Close dropdown on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    }, { signal });
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

      // Handle blokkskjema version selection (URL param > localStorage > option > API default)
      this.initBlokkskjemaVersion();

      // Initialize validator with regler from loaded data (v2 API)
      if (this.dataHandler.data && this.dataHandler.data.regler) {
        await this.validator.init(this.dataHandler.data.regler);
      } else {
        console.warn('⚠️ No regler found in data, validator will use fallback');
        await this.validator.init(null);
      }

      // Check for admin mode (enables version switcher)
      this.checkAdminMode();

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
    // Version switcher (if enabled)
    this.attachVersionSwitcherListeners();

    // Filter buttons - Programområde
    this.container.querySelectorAll('[data-programomrade]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const programomrade = e.currentTarget.dataset.programomrade;
        this.state.setProgramomrade(programomrade);
      });
    });

    // Filter buttons - Fremmedspråk
    this.container.querySelectorAll('[data-fremmedsprak]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const harFremmedsprak = e.currentTarget.dataset.fremmedsprak === 'true';
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

    // Don't re-render if a modal is open (it would close the modal)
    const anyModalOpen = this.container.querySelector('.sp-modal[style*="display: flex"]') ||
                         this.container.querySelector('.sp-modal[style*="display:flex"]');
    if (anyModalOpen) {
      return;
    }

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
        const fagToSave = {...selectedFag};
        this.closeVG1Modal(type);
        this.state.setVG1Subject(type, fagToSave);
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

    // FIXED (2024-11-24): Reset array and use consistent id field
    // id should be curriculum id (e.g., 'fysikk-1'), not fagkode (e.g., 'FYS1002')
    this.selectedBlokkskjemaFag = [];

    // Restore existing selections from state using unified structure
    const existingFag = currentState[trinn]?.selections || [];
    this.selectedBlokkskjemaFag = existingFag.map(fag => ({
      id: fag.id || fag.fagkode,  // Use curriculum id first (consistent with DOM data-id)
      navn: fag.navn,
      timer: fag.timer,
      fagkode: fag.fagkode,
      blokkId: fag.blokkId
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
        const blokkId = fag.blokkId;  // which blokk was it selected from

        // Find the specific fag item in the correct blokk
        let fagItem;
        if (blokkId) {
          // Search within specific blokk first
          const blokk = modal.querySelector(`.sp-blokk[data-blokk-id="${blokkId}"]`);
          fagItem = blokk?.querySelector(`.sp-blokk-fag-item[data-id="${fagId}"]`);
        }

        // Fallback: search globally if blokkId not found or not specified
        if (!fagItem) {
          fagItem = modal.querySelector(`.sp-blokk-fag-item[data-id="${fagId}"]`);
        }

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
    }

    // IMPORTANT: Set currentTrinn BEFORE calling updateBlokkValidation
    // (moved up from after validation call - fixes fordypning not showing on modal open)
    modal.dataset.currentTrinn = trinn;

    // Run initial validation to show fordypning and selected-elsewhere hints
    this.updateBlokkValidation(modal);

    // Update button with existing selection count
    const primaryBtn = modal.querySelector('.sp-btn-primary');
    this.updateModalButton(modal, primaryBtn);

    // ACCESSIBILITY: Store the element that opened the modal for focus return
    this.modalTriggerElement = document.activeElement;

    modal.style.display = 'flex';

    // ACCESSIBILITY: Set focus to modal title (or first focusable element)
    const modalTitle = modal.querySelector('.sp-modal-title');
    if (modalTitle) {
      modalTitle.setAttribute('tabindex', '-1');
      modalTitle.focus();
    }
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

      // ACCESSIBILITY: Return focus to the element that opened the modal
      if (this.modalTriggerElement && typeof this.modalTriggerElement.focus === 'function') {
        this.modalTriggerElement.focus();
        this.modalTriggerElement = null;
      }
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
    // FIXED (2024-11-24): Exclude matematikk from getting fordypning colors
    // matematikk-r1, matematikk-s1 etc. should NOT get blue/green fordypning styling
    const getFordypningLevel = (fagId) => {
      // Skip matematikk - these are not fordypningsfag
      if (fagId.startsWith('matematikk')) return null;
      // Skip historie - fellesfag, not fordypning
      if (fagId.startsWith('historie')) return null;
      // Skip spansk - obligatorisk for non-fremmedspråk students
      if (fagId.startsWith('spansk')) return null;

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

            // Sanitize user-facing strings to prevent XSS
            const safeName = sanitizeHTML(f.title || f.id);
            const safeId = sanitizeHTML(f.id);
            const safeFagkode = sanitizeHTML(f.fagkode || f.id);
            const safeMerknad = f.merknad ? sanitizeHTML(f.merknad) : '';

            // ARIA: role="checkbox" for selectable items, tabindex for keyboard nav
            const isBlocked = shouldBlockSpansk;
            return `
            <div class="${classes.join(' ')}"
                 data-id="${safeId}"
                 data-fagkode="${safeFagkode}"
                 data-timer="${f.timer}"
                 ${f.lareplan ? ` data-lareplan="${sanitizeHTML(f.lareplan)}"` : ''}
                 ${fordypningLevel ? ` data-fordypning="${fordypningLevel}"` : ''}
                 role="checkbox"
                 aria-checked="false"
                 aria-label="${safeName}, ${f.timer} timer${fordypningLevel ? ', fordypning nivå ' + fordypningLevel : ''}"
                 tabindex="${isBlocked ? '-1' : '0'}">
              <div class="sp-blokk-fag-row">
                <span class="sp-blokk-fag-navn">${safeName}</span>
                <div class="sp-blokk-fag-right">
                  <span class="sp-blokk-fag-timer">${f.timer}t</span>
                  <button class="sp-fag-info-btn" data-fag-info="${safeId}" title="Se fagdetaljer" aria-label="Se detaljer for ${safeName}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
                    </svg>
                  </button>
                </div>
              </div>
              ${safeMerknad ? `<div class="sp-blokk-fag-note">${safeMerknad}</div>` : ''}
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

    // Create AbortController for cleanup
    this.modalAbortController = new AbortController();
    const { signal } = this.modalAbortController;

    const closeBtn = modal.querySelector('.sp-modal-close');
    const cancelBtn = modal.querySelector('.sp-btn-secondary');
    const primaryBtn = modal.querySelector('.sp-btn-primary');

    // Close modal (with abort signal for cleanup)
    closeBtn.addEventListener('click', () => this.closeBlokkskjemaModal(), { signal });
    cancelBtn.addEventListener('click', () => this.closeBlokkskjemaModal(), { signal });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeBlokkskjemaModal();
    }, { signal });

    // ACCESSIBILITY: Keyboard navigation
    modal.addEventListener('keydown', (e) => {
      // Escape to close
      if (e.key === 'Escape') {
        this.closeBlokkskjemaModal();
        return;
      }

      // Tab trap - keep focus within modal
      if (e.key === 'Tab') {
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), .sp-blokk-fag-item:not(.blocked)'
        );
        const focusableArray = Array.from(focusableElements);
        const firstFocusable = focusableArray[0];
        const lastFocusable = focusableArray[focusableArray.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: if on first element, go to last
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else {
          // Tab: if on last element, go to first
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }
    }, { signal });

    // Fag selection (delegated event listener)
    // NEW APPROACH: Allow all selections, show validation errors, disable button if invalid
    modal.addEventListener('click', (e) => {
      // BUGFIX: Early return if clicking info button
      // Info buttons should show fag details, not trigger selection
      if (e.target.closest('.sp-fag-info-btn')) {
        return;
      }

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
        fagItem.setAttribute('aria-checked', 'false');  // ARIA update
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

        // Check if fag is already selected in OTHER TRINN (cross-year duplicate check)
        const currentState = this.state.getState();
        const currentTrinn = modal.dataset.currentTrinn;
        const otherTrinn = currentTrinn === 'vg2' ? 'vg3' : 'vg2';
        const otherTrinnSelections = currentState[otherTrinn]?.selections || [];
        const isSelectedInOtherYear = otherTrinnSelections.some(f => {
          return (f.id || f.fagkode) === fagId;
        });

        if (isSelectedInOtherYear) {
          // Shake animation
          fagItem.classList.add('shake');
          setTimeout(() => fagItem.classList.remove('shake'), 500);

          // Show error message
          this.showModalValidationError(
            modal,
            currentTrinn === 'vg2'
              ? `Dette faget er allerede valgt i VG3. Samme fag kan ikke velges to ganger.`
              : `Dette faget er allerede valgt i VG2. Samme fag kan ikke velges to ganger.`
          );
          return;
        }

        // NO MAX CHECK HERE - User can freely swap fag between blokker
        // Submit validation will check if total selection is valid

        // Deselect any other fag in same blokk (1 per blokk rule - swap)
        blokk?.querySelectorAll('.sp-blokk-fag-item.selected').forEach(item => {
          item.classList.remove('selected');
          item.setAttribute('aria-checked', 'false');  // ARIA update
          const oldId = item.dataset.id;  // use curriculum id
          this.selectedBlokkskjemaFag = this.selectedBlokkskjemaFag.filter(f =>
            !(f.id === oldId && f.blokkId === blokkId)
          );
        });

        // Select this fag
        fagItem.classList.add('selected');
        fagItem.setAttribute('aria-checked', 'true');  // ARIA update
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
    }, { signal });

    // Info button - show fag details modal
    // Supports both .sp-fag-item-info (main view) and .sp-fag-info-btn (blokkskjema modal)
    modal.addEventListener('click', (e) => {
      const infoBtn = e.target.closest('.sp-fag-item-info') || e.target.closest('.sp-fag-info-btn');
      if (!infoBtn) return;

      e.stopPropagation(); // Prevent fag selection when clicking info button
      // Support both data-fag-id and data-fag-info attributes
      const fagId = infoBtn.dataset.fagId || infoBtn.dataset.fagInfo;
      if (fagId) {
        this.showFagDetails(fagId);
      }
    }, { signal });

    // Primary button - confirm selection
    primaryBtn.addEventListener('click', () => {
      const trinn = modal.dataset.currentTrinn;
      if (trinn && this.selectedBlokkskjemaFag.length > 0) {
        // STEP 1: VALIDATE
        if (trinn === 'vg2') {
          const matematikkFag = this.selectedBlokkskjemaFag.find(f =>
            f.fagkode?.startsWith('matematikk') || f.id?.startsWith('matematikk')
          );

          // Validate: matematikk must be selected for VG2
          if (!matematikkFag) {
            this.showModalValidationError(modal, 'Du må velge matematikk for VG2!');
            return;
          }
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
        }

        // STEP 2: SAVE TO TEMP VARIABLES
        const selectionsToSave = [...this.selectedBlokkskjemaFag];

        // STEP 3: CLOSE MODAL FIRST (before state update)
        this.selectedBlokkskjemaFag = [];
        this.closeBlokkskjemaModal();

        // STEP 4: UPDATE STATE (triggers re-render now that modal is closed)
        // REFACTORED (2024-11-24): Use unified setTrinnSelections for both VG2 and VG3
        // This handles slot assignment automatically and preserves blokkId
        this.state.setTrinnSelections(trinn, selectionsToSave);
      }
    }, { signal });

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
      const fagId = item.dataset.id;  // BUGFIX: Use curriculum id (e.g., 'kjemi-2') instead of fagkode (e.g., 'KJE1002')
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

      // Check if fag is selected in OTHER TRINN (cross-year duplicate check)
      const currentTrinn = modal.dataset.currentTrinn;
      const otherTrinn = currentTrinn === 'vg2' ? 'vg3' : 'vg2';
      const otherTrinnSelections = currentState[otherTrinn]?.selections || [];
      const isSelectedInOtherYear = otherTrinnSelections.some(f => {
        // Match by id (e.g., "fysikk-1") - this prevents selecting same fag across years
        return (f.id || f.fagkode) === item.dataset.id;
      });

      if (isSelectedInOtherYear && !isSelectedHere) {
        item.classList.add('selected-in-other-year');
        item.dataset.trinn = currentTrinn; // For CSS ::after content
        item.title = currentTrinn === 'vg2'
          ? 'Dette faget er allerede valgt i VG3. Samme fag kan ikke velges to ganger.'
          : 'Dette faget er allerede valgt i VG2. Samme fag kan ikke velges to ganger.';
        // Add hint icon
        this.addValidationHint(item, '🚫', 'Allerede valgt i annet trinn');
        return;
      }

      // SIMPLIFIED: Removed obligatorisk priority blocking logic
      // User can select fag in any order - submit validation will ensure Historie is selected
      // Max check is now only in click handler, not in visual validation


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

      // FIXED (2024-11-24): selectedBlokkskjemaFag already contains all VG3 selections
      // (restored from state when modal opened + any changes)
      const tempVg3Selections = [...this.selectedBlokkskjemaFag];

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
          const fagId = item.dataset.id?.toLowerCase();  // BUGFIX: Use curriculum id instead of fagkode
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
        // ARIA: Live region for screen reader announcements
        validering.setAttribute('role', 'status');
        validering.setAttribute('aria-live', 'polite');
        validering.setAttribute('aria-atomic', 'true');
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

      // SIMPLIFIED (2024-11-24): Remove VG2 programfag display, only show fordypning
      // Both VG2 and VG3 use same fordypning display
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
    }

    // Validation errors - ONLY show when all fag are selected
    const valgregler = this.dataHandler.getValgreglerForTrinn(currentState.programomrade, currentTrinn);
    const required = valgregler?.maxAntallFag || 4;
    const count = this.selectedBlokkskjemaFag.length;

    if (this.blokkValidationErrors.length > 0 && count >= required) {
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

    // FIXED (2024-11-24): REPLACE instead of ADD
    // selectedBlokkskjemaFag already contains all selections for current trinn
    // (restored from state when modal opened + any new changes)
    if (currentTrinn === 'vg2') {
      tempState.vg2.selections = [...this.selectedBlokkskjemaFag];
    } else {
      tempState.vg3.selections = [...this.selectedBlokkskjemaFag];
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

    // NO AUTO-SELECT FOR HISTORIE (Removed 2024-11-24)
    // User should be able to select Historie in any order, not auto-fill


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
   * Check if a fag is a valgfri programfag
   * @param {string} fagId - Subject ID
   * @returns {boolean}
   */
  isValgfriProgramfag(fagId) {
    const curriculum = this.dataHandler.data?.curriculum;
    if (!curriculum) return false;
    return curriculum.valgfrieProgramfag?.some(f => f.id === fagId) || false;
  }

  /**
   * Render a single accordion component
   * @param {string} id - Unique ID for accordion
   * @param {string} title - Accordion header text
   * @param {string} content - HTML content inside accordion
   * @param {number|null} count - Optional count to show in header
   * @returns {string} HTML string
   */
  renderAccordion(id, title, content, count = null) {
    const countBadge = count !== null ? `<span class="accordion-count">(${count})</span>` : '';

    return `
      <div class="fag-accordion" data-accordion-id="${id}">
        <div class="accordion-header" role="button" tabindex="0" aria-expanded="false">
          <h3>${title} ${countBadge}</h3>
          <span class="accordion-icon" aria-hidden="true">▼</span>
        </div>
        <div class="accordion-content">
          ${content}
        </div>
      </div>
    `;
  }

  /**
   * Render kjerneelementer as HTML
   * @param {Array|null} kjerneelementer - Array of {title, content} objects
   * @returns {string} HTML string
   */
  renderKjerneelementerHTML(kjerneelementer) {
    if (!kjerneelementer || kjerneelementer.length === 0) {
      return '<p class="placeholder-text">Innhold kommer snart</p>';
    }

    return kjerneelementer.map(el => `
      <div class="kjerneelement">
        <h4>${sanitizeHTML(el.title)}</h4>
        <p>${sanitizeHTML(el.content)}</p>
      </div>
    `).join('');
  }

  /**
   * Extract "Om faget" section from beskrivelseHTML
   * @param {string} beskrivelseHTML - Full HTML content
   * @returns {string} HTML string
   */
  extractOmFagetHTML(beskrivelseHTML) {
    const match = beskrivelseHTML.match(/<h2[^>]*>Om faget<\/h2>([\s\S]*?)(?=<h2|$)/i);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract "Kompetansemål" section from beskrivelseHTML
   * @param {string} beskrivelseHTML - Full HTML content
   * @returns {string} HTML string
   */
  extractKompetansemalHTML(beskrivelseHTML) {
    const match = beskrivelseHTML.match(/<h2[^>]*>Kompetansemål<\/h2>([\s\S]*?)(?=<h2|$)/i);
    return match ? match[1].trim() : '';
  }

  /**
   * Render modal body for valgfrie programfag with 4 accordions
   * @param {Object} fag - Fag data
   * @returns {string} HTML string
   */
  renderValgfriProgramfagBody(fag) {
    // Extract "Om faget" from beskrivelseHTML
    const omFagetHTML = this.extractOmFagetHTML(fag.beskrivelseHTML || '');

    // Accordion 1: Hvordan arbeider man i faget
    const hvordanHTML = fag.hvordanArbeiderMan
      ? `<p>${sanitizeHTML(fag.hvordanArbeiderMan)}</p>`
      : '<p class="placeholder-text">Innhold kommer snart</p>';

    // Accordion 2: Fagets relevans
    const relevansHTML = fag.fagetsRelevans
      ? `<p>${sanitizeHTML(fag.fagetsRelevans)}</p>`
      : '<p class="placeholder-text">Innhold kommer snart</p>';

    // Accordion 3: I dette faget lærer du å ... (kompetansemål)
    const kompetanseHTML = this.extractKompetansemalHTML(fag.beskrivelseHTML || '');
    const kompetanseCount = (kompetanseHTML.match(/<li>/g) || []).length;

    // Accordion 4: Kjerneelementer
    const kjerneHTML = this.renderKjerneelementerHTML(fag.kjerneelementer);
    const kjerneCount = fag.kjerneelementer?.length || 0;

    return `
      <div class="om-faget">
        <h2>Om faget</h2>
        ${omFagetHTML || '<p>Ingen beskrivelse tilgjengelig.</p>'}
      </div>

      <div class="fag-accordions">
        ${this.renderAccordion('hvordan', 'Hvordan arbeider man i faget?', hvordanHTML, null)}
        ${this.renderAccordion('relevans', 'Fagets relevans', relevansHTML, null)}
        ${kompetanseHTML ? this.renderAccordion('kompetanse', 'I dette faget lærer du å ...', kompetanseHTML, kompetanseCount) : ''}
        ${this.renderAccordion('kjerne', 'Kjerneelementer', kjerneHTML, kjerneCount > 0 ? kjerneCount : null)}
      </div>
    `;
  }

  /**
   * Render modal body for fellesfag and obligatoriske programfag
   * Simple view: Om faget, Kompetansemål accordion, Kjerneelementer accordion
   * @param {Object} fag - Fag data
   * @returns {string} HTML string
   */
  renderStandardFagBody(fag) {
    // Extract "Om faget" from beskrivelseHTML
    const omFagetHTML = this.extractOmFagetHTML(fag.beskrivelseHTML || '');

    // Kompetansemål
    const kompetanseHTML = this.extractKompetansemalHTML(fag.beskrivelseHTML || '');
    const kompetanseCount = (kompetanseHTML.match(/<li>/g) || []).length;

    // Kjerneelementer
    const kjerneHTML = this.renderKjerneelementerHTML(fag.kjerneelementer);
    const kjerneCount = fag.kjerneelementer?.length || 0;

    return `
      <div class="om-faget">
        <h2>Om faget</h2>
        ${omFagetHTML || '<p>Ingen beskrivelse tilgjengelig.</p>'}
      </div>

      <div class="fag-accordions">
        ${kompetanseHTML ? this.renderAccordion('kompetanse', 'I dette faget lærer du å ...', kompetanseHTML, kompetanseCount) : ''}
        ${kjerneCount > 0 || fag.kjerneelementer ? this.renderAccordion('kjerne', 'Kjerneelementer', kjerneHTML, kjerneCount > 0 ? kjerneCount : null) : ''}
      </div>
    `;
  }

  /**
   * Setup accordion click handlers in modal
   * @param {HTMLElement} modal - Modal element
   */
  setupFagAccordionHandlers(modal) {
    modal.querySelectorAll('.fag-accordion .accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const accordion = header.closest('.fag-accordion');
        const content = accordion.querySelector('.accordion-content');
        const isOpen = accordion.classList.contains('open');

        if (isOpen) {
          accordion.classList.remove('open');
          header.setAttribute('aria-expanded', 'false');
        } else {
          accordion.classList.add('open');
          header.setAttribute('aria-expanded', 'true');
        }
      });

      // Keyboard support
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          header.click();
        }
      });
    });
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

      // Fallback: try without -vg1/-vg2/-vg3 suffix (handles ID mismatch between data sources)
      if (!fag) {
        const strippedId = fagId.replace(/-vg[123]$/, '');
        fag = curriculum.fellesfag.find(f => f.id === strippedId);
      }
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

    // Check if this is a valgfri programfag (needs 4 accordions)
    const isValgfri = this.isValgfriProgramfag(fag.id);

    // Related badge (fordypning) - inline with fagkode
    const relatedBadge = fag.related && fag.related.length > 0
      ? `<span class="related-badge">Fordypning med: ${fag.related.join(', ')}</span>`
      : '';

    // Hero section with image (or fallback without)
    // Convert relative image path to absolute URL for embedded usage
    const baseUrl = this.options.apiBaseUrl?.replace('/dist/api/v2', '') || '';
    const imageUrl = fag.bilde ? `${baseUrl}${fag.bilde}` : null;

    const heroHTML = imageUrl
      ? `<div class="modal-hero">
          <img src="${imageUrl}" alt="${fag.shortTitle || fag.title}" class="modal-hero-image" />
          <div class="modal-hero-overlay"></div>
          <div class="modal-hero-content">
            <h2>${fag.shortTitle || fag.title}</h2>
            <div class="modal-hero-badges">
              <span class="fagkode-badge">${fag.fagkode}</span>
              ${relatedBadge}
            </div>
          </div>
        </div>`
      : `<div class="modal-hero no-image">
          <div class="modal-hero-content">
            <h2>${fag.shortTitle || fag.title}</h2>
            <div class="modal-hero-badges">
              <span class="fagkode-badge">${fag.fagkode}</span>
              ${relatedBadge}
            </div>
          </div>
        </div>`;

    // Vimeo video if available
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

    // Render modal body based on fag type
    const modalBodyHTML = isValgfri
      ? this.renderValgfriProgramfagBody(fag)
      : this.renderStandardFagBody(fag);

    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" aria-label="Lukk">&times;</button>

        ${heroHTML}

        ${vimeoHTML}

        <div class="modal-body">
          ${modalBodyHTML}
        </div>

        <a href="https://sokeresultat.udir.no/finn-lareplan.html?query=${fag.fagkode}&source=Laereplan&fltypefiltermulti=L%C3%A6replan&filtervalues=all" target="_blank" class="btn-lareplan">Se full læreplan på udir.no →</a>
      </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Setup accordion handlers for fag-accordions
    this.setupFagAccordionHandlers(modal);

    // Close button - use proper event listener instead of inline onclick
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeFagModal();
    }

    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.closeFagModal();
      }
    };

    // ACCESSIBILITY: Escape to close and focus trap
    modal.onkeydown = (e) => {
      if (e.key === 'Escape') {
        this.closeFagModal();
      }
    };

    // Focus the close button for accessibility
    closeBtn?.focus();
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
