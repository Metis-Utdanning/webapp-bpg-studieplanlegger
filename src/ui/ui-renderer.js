/**
 * UI Renderer - Renders widget UI based on state and data
 */

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

export class UIRenderer {
  constructor(container, state, dataHandler, options = {}) {
    this.container = container;
    this.state = state;
    this.dataHandler = dataHandler;
    this.options = options;
  }

  /**
   * Check if any fag selections have been made
   */
  hasAnySelections(state) {
    // NEW: Check selections[] arrays instead of old properties
    return (
      (state.vg1.selections && state.vg1.selections.length > 0) ||
      (state.vg2.selections && state.vg2.selections.length > 0) ||
      (state.vg3.selections && state.vg3.selections.length > 0)
    );
  }

  /**
   * Render the entire widget
   */
  render() {
    this.container.innerHTML = `
      <div class="studieplanlegger-widget">
        ${this.renderFilter()}
        ${this.renderValidation()}
        ${this.renderVGGrid()}
        ${this.renderFeedbackLink()}
        ${this.renderModals()}
      </div>
    `;
  }

  /**
   * Render feedback link and print button at bottom of widget
   */
  renderFeedbackLink() {
    const showSwitcher = this.options?.showVersionSwitcher;
    const versions = this.dataHandler.getAvailableVersions();
    const currentVersion = this.dataHandler.getActiveVersion();

    // Only show version switcher if enabled and multiple versions exist
    const showVersionUI = showSwitcher && versions.length > 1;

    return `
      <div class="sp-feedback-section">
        <button class="sp-print-btn" onclick="window.print()" title="Skriv ut eller lagre som PDF">
          Skriv ut studieplan
        </button>
        <span class="sp-feedback-divider">|</span>
        <a href="https://forms.office.com/e/Y7ekhKc9GD" target="_blank" rel="noopener" class="sp-feedback-link">
          Gi tilbakemelding
        </a>
        ${showVersionUI ? `
          <span class="sp-feedback-divider">|</span>
          <div class="sp-version-switcher">
            <button class="sp-version-btn" aria-haspopup="listbox" aria-expanded="false">
              Blokkskjema (${sanitizeHTML(currentVersion)})
            </button>
            <div class="sp-version-dropdown hidden" role="listbox">
              ${versions.map(v => `
                <button class="sp-version-option ${v === currentVersion ? 'active' : ''}"
                        role="option"
                        aria-selected="${v === currentVersion}"
                        data-version="${sanitizeHTML(v)}">
                  ${sanitizeHTML(v)}${v === currentVersion ? ' ✓' : ''}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${showSwitcher && versions.length === 1 ? `
          <span class="sp-feedback-divider">|</span>
          <span class="sp-version-indicator" title="Kun én blokkskjema-versjon tilgjengelig">
            Blokkskjema: ${sanitizeHTML(currentVersion)}
          </span>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render filter section
   */
  renderFilter() {
    const currentState = this.state.getState();

    return `
      <div class="sp-filter-section">
        <div class="sp-filter-grid">
          <div class="sp-filter-group">
            <label class="sp-filter-label">Velg programområde:</label>
            <div class="sp-filter-buttons">
              <button class="sp-filter-btn ${currentState.programomrade === 'studiespesialisering' ? 'selected' : ''}"
                      data-programomrade="studiespesialisering">
                Studiespesialisering
              </button>
              <button class="sp-filter-btn ${currentState.programomrade === 'musikk-dans-drama' ? 'selected' : ''}"
                      data-programomrade="musikk-dans-drama">
                Musikk, dans og drama
              </button>
              <button class="sp-filter-btn ${currentState.programomrade === 'medier-kommunikasjon' ? 'selected' : ''}"
                      data-programomrade="medier-kommunikasjon">
                Medier og kommunikasjon
              </button>
            </div>
          </div>

          <div class="sp-filter-group sp-filter-group-with-action">
            <div class="sp-filter-group-main">
              <label class="sp-filter-label">Hadde du fremmedspråk på ungdomsskolen?</label>
              <div class="sp-filter-buttons">
                <button class="sp-filter-btn ${currentState.harFremmedsprak ? 'selected' : ''}"
                        data-fremmedsprak="true">
                  Ja
                </button>
                <button class="sp-filter-btn ${!currentState.harFremmedsprak ? 'selected' : ''}"
                        data-fremmedsprak="false">
                  Nei
                </button>
              </div>
            </div>
            <div class="sp-filter-action">
              <button class="sp-fjern-valg-btn ${this.hasAnySelections(currentState) ? 'active' : ''}"
                      ${!this.hasAnySelections(currentState) ? 'disabled' : ''}>
                Fjern alle valg
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render validation section
   */
  renderValidation() {
    const validation = this.state.validate();

    return `
      <div class="sp-validering">
        <div class="sp-validering-items">
          <div class="sp-validering-item ${validation.vg1Complete ? 'met' : 'unmet'}">
            <div class="sp-validering-icon">${validation.vg1Complete ? '✓' : '!'}</div>
            <div class="sp-validering-text">VG1 fag valgt</div>
          </div>
          <div class="sp-validering-item ${validation.vg2Complete ? 'met' : 'unmet'}">
            <div class="sp-validering-icon">${validation.vg2Complete ? '✓' : '!'}</div>
            <div class="sp-validering-text">VG2 programfag</div>
          </div>
          <div class="sp-validering-item ${validation.vg3Complete ? 'met' : 'unmet'}">
            <div class="sp-validering-icon">${validation.vg3Complete ? '✓' : '!'}</div>
            <div class="sp-validering-text">VG3 programfag</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render VG grid (VG1, VG2, VG3 columns)
   */
  renderVGGrid() {
    const currentState = this.state.getState();
    return `
      <div class="sp-vg-grid" data-programomrade="${currentState.programomrade}">
        ${this.renderVG1()}
        ${this.renderVG2()}
        ${this.renderVG3()}
      </div>
    `;
  }

  /**
   * Render VG1 column
   */
  renderVG1() {
    const currentState = this.state.getState();
    const fellesfag = this.dataHandler.getFellesfag(currentState.programomrade, 'vg1');
    const fellesProgramfag = this.dataHandler.getFellesProgramfag(currentState.programomrade, 'vg1');

    return `
      <div class="sp-vg-column">
        <div class="sp-vg-header">
          VG1
          <div class="sp-vg-timer">842 timer</div>
        </div>
        <div class="sp-vg-content">
          <div class="sp-fag-section">
            <div class="sp-fag-section-title">Fellesfag</div>
            ${fellesfag.map(fag => `
              <div class="sp-fag-item fellesfag">
                <div class="sp-fag-item-title">${sanitizeHTML(fag.navn)}</div>
                <div class="sp-fag-item-meta">
                  <div class="sp-fag-item-timer">${fag.timer}t</div>
                  <button class="sp-fag-item-info" data-fag-id="${sanitizeHTML(fag.id)}" title="Se fagdetaljer" aria-label="Se detaljer for ${sanitizeHTML(fag.navn)}">
                    <svg width="14" height="14" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
                    </svg>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          ${fellesProgramfag.length > 0 ? `
            <div class="sp-divider"></div>
            <div class="sp-fag-section">
              <div class="sp-fag-section-title">Felles programfag</div>
              ${fellesProgramfag.map(fag => `
                <div class="sp-fag-item obligatorisk-programfag">
                  <div class="sp-fag-item-title">${sanitizeHTML(fag.navn)}</div>
                  <div class="sp-fag-item-meta">
                    <div class="sp-fag-item-timer">${fag.timer}t</div>
                    <button class="sp-fag-item-info" data-fag-id="${sanitizeHTML(fag.id)}" title="Se fagdetaljer" aria-label="Se detaljer for ${sanitizeHTML(fag.navn)}">
                    <svg width="14" height="14" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
                    </svg>
                  </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="sp-divider"></div>

          <div class="sp-fag-section">
            <div class="sp-fag-section-title">Velg dine fag (klikk for å velge)</div>

            ${this.renderVG1Subject('fremmedsprak', this.state.getVG1Fremmedsprak())}
            ${this.renderVG1Subject('matematikk', this.state.getVG1Matematikk())}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render VG1 subject slot
   */
  renderVG1Subject(type, selectedSubject) {
    const labels = {
      'fremmedsprak': 'fremmedspråk',
      'matematikk': 'matematikk'
    };

    if (selectedSubject) {
      return `
        <div class="sp-fag-item selected sp-vg1-${type}-slot" data-type="${type}">
          <div class="sp-fag-item-title">${selectedSubject.navn}</div>
          <div class="sp-fag-item-meta">
            <div class="sp-fag-item-timer">${selectedSubject.timer}t</div>
            <button class="sp-fag-item-info" data-fag-id="${selectedSubject.id}" title="Se fagdetaljer" aria-label="Se detaljer for ${selectedSubject.navn}">
              <svg width="14" height="14" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
              </svg>
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="sp-fag-item empty-slot sp-vg1-${type}-slot" data-type="${type}">
        <div class="sp-fag-item-title">Klikk for å velge ${labels[type]}</div>
      </div>
    `;
  }

  /**
   * Render VG2 column
   */
  renderVG2() {
    const currentState = this.state.getState();
    const fellesfag = this.dataHandler.getFellesfag(currentState.programomrade, 'vg2');
    const fellesProgramfag = this.dataHandler.getFellesProgramfag(currentState.programomrade, 'vg2');

    return `
      <div class="sp-vg-column">
        <div class="sp-vg-header">
          VG2
          <div class="sp-vg-timer">840 timer</div>
        </div>
        <div class="sp-vg-content">
          <div class="sp-fag-section">
            <div class="sp-fag-section-title">Fellesfag</div>
            ${fellesfag.map(fag => `
              <div class="sp-fag-item fellesfag">
                <div class="sp-fag-item-title">${sanitizeHTML(fag.navn)}</div>
                <div class="sp-fag-item-meta">
                  <div class="sp-fag-item-timer">${fag.timer}t</div>
                  <button class="sp-fag-item-info" data-fag-id="${sanitizeHTML(fag.id)}" title="Se fagdetaljer" aria-label="Se detaljer for ${sanitizeHTML(fag.navn)}">
                    <svg width="14" height="14" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
                    </svg>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          ${fellesProgramfag.length > 0 ? `
            <div class="sp-divider"></div>
            <div class="sp-fag-section">
              <div class="sp-fag-section-title">Felles programfag</div>
              ${fellesProgramfag.map(fag => `
                <div class="sp-fag-item obligatorisk-programfag">
                  <div class="sp-fag-item-title">${sanitizeHTML(fag.navn)}</div>
                  <div class="sp-fag-item-meta">
                    <div class="sp-fag-item-timer">${fag.timer}t</div>
                    <button class="sp-fag-item-info" data-fag-id="${sanitizeHTML(fag.id)}" title="Se fagdetaljer" aria-label="Se detaljer for ${sanitizeHTML(fag.navn)}">
                    <svg width="14" height="14" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
                    </svg>
                  </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="sp-divider"></div>

          <div class="sp-fag-section sp-vg2-matematikk-gruppe" data-trinn="vg2">
            <div class="sp-fag-section-title">Matematikk (klikk for å velge)</div>
            ${this.renderVG2Matematikk(this.state.getVG2Matematikk())}
          </div>

          <div class="sp-divider"></div>

          ${this.renderProgramfagSlots('vg2')}
        </div>
      </div>
    `;
  }

  /**
   * Render VG2 matematikk slot (filled from blokkskjema selection)
   */
  renderVG2Matematikk(matematikk) {
    if (matematikk) {
      return `
        <div class="sp-fag-item selected">
          <div class="sp-fag-item-title">${matematikk.navn}</div>
          <div class="sp-fag-item-meta">
            <div class="sp-fag-item-timer">${matematikk.timer}t</div>
            <button class="sp-fag-item-info" data-fag-id="${matematikk.id}" title="Se fagdetaljer" aria-label="Se detaljer for ${matematikk.navn}">
              <svg width="14" height="14" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
              </svg>
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="sp-fag-item empty-slot">
        <div class="sp-fag-item-title">Velges i blokkskjema</div>
      </div>
    `;
  }

  /**
   * Render VG3 column
   */
  renderVG3() {
    const currentState = this.state.getState();
    const allFellesfag = this.dataHandler.getFellesfag(currentState.programomrade, 'vg3');
    const fellesProgramfag = this.dataHandler.getFellesProgramfag(currentState.programomrade, 'vg3');

    // Separate Historie from other fellesfag (Historie must be selected in blokkskjema)
    const historie = allFellesfag.find(f => f.fagkode === 'HIS1010' || f.navn === 'Historie');
    const fellesfag = allFellesfag.filter(f => f.fagkode !== 'HIS1010' && f.navn !== 'Historie');

    // Check if Histoire has been selected in blokkskjema (NEW: from selections[])
    const selectedHistorie = currentState.vg3.selections
      ? currentState.vg3.selections.find(f =>
          f.fagkode === 'HIS1010' || f.id === 'historie-vg3' || f.slot === 'historie'
        )
      : null;

    return `
      <div class="sp-vg-column">
        <div class="sp-vg-header">
          VG3
          <div class="sp-vg-timer">841 timer</div>
        </div>
        <div class="sp-vg-content">
          <div class="sp-fag-section">
            <div class="sp-fag-section-title">Fellesfag</div>
            ${fellesfag.map(fag => `
              <div class="sp-fag-item fellesfag">
                <div class="sp-fag-item-title">${sanitizeHTML(fag.navn)}</div>
                <div class="sp-fag-item-meta">
                  <div class="sp-fag-item-timer">${fag.timer}t</div>
                  <button class="sp-fag-item-info" data-fag-id="${sanitizeHTML(fag.id)}" title="Se fagdetaljer" aria-label="Se detaljer for ${sanitizeHTML(fag.navn)}">
                    <svg width="14" height="14" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
                    </svg>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          ${historie ? `
            <div class="sp-divider"></div>
            <div class="sp-fag-section sp-vg3-historie-gruppe" data-trinn="vg3">
              <div class="sp-fag-section-title">Historie (velges i blokkskjema)</div>
              <div class="sp-fag-item ${selectedHistorie ? 'selected' : 'empty-slot historie-obligatorisk'}">
                <div class="sp-fag-item-title">${selectedHistorie ? 'Historie' : 'Klikk for å velge historie'}</div>
                ${selectedHistorie ? `
                  <div class="sp-fag-item-meta">
                    <div class="sp-fag-item-timer">${historie.timer}t</div>
                    <button class="sp-fag-item-info" data-fag-id="${historie.id}" title="Se fagdetaljer" aria-label="Se detaljer for Historie">
                    <svg width="14" height="14" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
                    </svg>
                  </button>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          ${fellesProgramfag.length > 0 ? `
            <div class="sp-divider"></div>
            <div class="sp-fag-section">
              <div class="sp-fag-section-title">Felles programfag</div>
              ${fellesProgramfag.map(fag => `
                <div class="sp-fag-item obligatorisk-programfag">
                  <div class="sp-fag-item-title">${sanitizeHTML(fag.navn)}</div>
                  <div class="sp-fag-item-meta">
                    <div class="sp-fag-item-timer">${fag.timer}t</div>
                    <button class="sp-fag-item-info" data-fag-id="${sanitizeHTML(fag.id)}" title="Se fagdetaljer" aria-label="Se detaljer for ${sanitizeHTML(fag.navn)}">
                    <svg width="14" height="14" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
                    </svg>
                  </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="sp-divider"></div>

          ${this.renderProgramfagSlots('vg3')}
        </div>
      </div>
    `;
  }

  /**
   * Render programfag slots for VG2/VG3
   */
  renderProgramfagSlots(trinn) {
    const currentState = this.state.getState();

    // NEW: Get programfag from selections[], excluding special slots
    let programfag = [];
    if (currentState[trinn] && currentState[trinn].selections) {
      programfag = currentState[trinn].selections.filter(s => {
        // For VG2: exclude matematikk slot (shown separately)
        if (trinn === 'vg2' && s.slot === 'matematikk') {
          return false;
        }
        // For VG3: exclude historie slot (shown in fellesfag)
        if (trinn === 'vg3' && s.slot === 'historie') {
          return false;
        }
        // Include all programfag slots
        return s.slot && s.slot.startsWith('programfag-');
      });
    }

    // Get required count from valgregler (use minAntallFag)
    const valgregler = this.dataHandler.getValgreglerForTrinn(currentState.programomrade, trinn);
    let required = valgregler?.minAntallFag || 3;

    // For VG3, subtract 1 because Historie is included in minAntallFag but shown separately
    if (trinn === 'vg3') {
      required = Math.max(0, required - 1);
    }

    const slots = [];
    for (let i = 0; i < required; i++) {
      if (programfag[i]) {
        slots.push(`
          <div class="sp-fag-item selected">
            <div class="sp-fag-item-title">${programfag[i].navn}</div>
            <div class="sp-fag-item-meta">
              <div class="sp-fag-item-timer">${programfag[i].timer}t</div>
              <button class="sp-fag-item-info" data-fag-id="${programfag[i].id}" title="Se fagdetaljer" aria-label="Se detaljer for ${programfag[i].navn}">
                <svg width="14" height="14" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
                </svg>
              </button>
            </div>
          </div>
        `);
      } else {
        slots.push(`
          <div class="sp-fag-item empty-slot">
            <div class="sp-fag-item-title">Klikk for å velge programfag ${i + 1}</div>
          </div>
        `);
      }
    }

    return `
      <div class="sp-fag-section sp-programfag-gruppe" data-trinn="${trinn}">
        <div class="sp-fag-section-title">Programfag (klikk for å velge)</div>
        ${slots.join('')}
      </div>
    `;
  }

  /**
   * Render all modals
   */
  renderModals() {
    return `
      ${this.renderVG1Modal('matematikk')}
      ${this.renderVG1Modal('fremmedsprak')}
      ${this.renderBlokkskjemaModal()}
    `;
  }

  /**
   * Render VG1 modal (matematikk or fremmedspråk)
   */
  renderVG1Modal(type) {
    const currentState = this.state.getState();
    const titles = {
      'matematikk': 'Velg matematikk for VG1',
      'fremmedsprak': 'Velg fremmedspråk for VG1'
    };

    const subtitles = {
      'matematikk': 'Velg hvilket matematikknivå du vil ta',
      'fremmedsprak': 'Velg hvilket språk du vil lære'
    };

    // Get fag from dataHandler based on type
    const fag = type === 'matematikk'
      ? this.dataHandler.getVG1Matematikk()
      : this.dataHandler.getVG1Fremmedsprak(currentState.harFremmedsprak);

    return `
      <div class="sp-modal sp-modal-${type}" style="display: none;">
        <div class="sp-modal-content sp-modal-vg1">
          <button class="sp-modal-close">×</button>

          <div class="sp-modal-header">
            <h2 class="sp-modal-title">${titles[type]}</h2>
            <p class="sp-modal-subtitle">${subtitles[type]}</p>
          </div>

          <div class="sp-vg1-fag-liste">
            ${fag.map(f => `
              <div class="sp-vg1-fag-item" data-fagkode="${f.fagkode}" data-timer="${f.timer}"${f.lareplan ? ` data-lareplan="${f.lareplan}"` : ''}>
                <div class="sp-vg1-fag-item-title">${f.navn}</div>
                <div class="sp-vg1-fag-item-timer">${f.timer} timer</div>
              </div>
            `).join('')}
          </div>

          <div class="sp-modal-footer">
            <div class="sp-modal-info"></div>
            <div class="sp-modal-actions">
              <button class="sp-btn sp-btn-secondary">Avbryt</button>
              <button class="sp-btn sp-btn-primary" disabled>Velg fag</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render blokkskjema modal
   */
  renderBlokkskjemaModal() {
    return `
      <div class="sp-modal sp-modal-blokkskjema" style="display: none;">
        <div class="sp-modal-content">
          <button class="sp-modal-close">×</button>

          <div class="sp-modal-header">
            <h2 class="sp-modal-title">Velg programfag</h2>
            <p class="sp-modal-subtitle">Velg dine programfag</p>
          </div>

          <div class="sp-validering">
            <div class="sp-validering-items">
              <div class="sp-validering-item unmet">
                <div class="sp-validering-icon">!</div>
                <div class="sp-validering-text">Velg programfag</div>
              </div>
            </div>
          </div>

          <div class="sp-blokkskjema" id="blokkskjema-content">
            <!-- Will be populated dynamically -->
          </div>

          <div class="sp-modal-footer">
            <div class="sp-modal-info"></div>
            <div class="sp-modal-actions">
              <button class="sp-btn sp-btn-secondary">Avbryt</button>
              <button class="sp-btn sp-btn-primary" disabled>Legg til</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
