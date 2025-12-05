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
    const currentDescription = this.dataHandler.getVersionDescription(currentVersion);

    // Only show version switcher if enabled and multiple versions exist
    const showVersionUI = showSwitcher && versions.length > 1;

    return `
      <div class="sp-feedback-section">
        <button class="sp-print-btn" onclick="window.print()" title="Skriv ut eller lagre som PDF">
          Skriv ut studieplan
        </button>
        <span class="sp-feedback-divider">|</span>
        <button class="sp-catalog-btn" title="Bla gjennom alle programfag">
          Bla i fagkatalog
        </button>
        <span class="sp-feedback-divider">|</span>
        <a href="https://forms.office.com/e/Y7ekhKc9GD" target="_blank" rel="noopener" class="sp-feedback-link">
          Gi tilbakemelding
        </a>
        ${showVersionUI ? `
          <span class="sp-feedback-divider">|</span>
          <div class="sp-version-switcher">
            <button class="sp-version-btn" aria-haspopup="listbox" aria-expanded="false" title="${sanitizeHTML(currentDescription)}">
              Blokkskjema: ${sanitizeHTML(this.dataHandler.formatVersionId(currentVersion))}
            </button>
            <div class="sp-version-dropdown hidden" role="listbox">
              ${versions.map(v => {
                const desc = this.dataHandler.getVersionDescription(v);
                const displayName = this.dataHandler.formatVersionId(v);
                return `
                <button class="sp-version-option ${v === currentVersion ? 'active' : ''}"
                        role="option"
                        aria-selected="${v === currentVersion}"
                        data-version="${sanitizeHTML(v)}"
                        title="${sanitizeHTML(desc)}">
                  ${sanitizeHTML(displayName)}${v === currentVersion ? ' ✓' : ''}
                </button>
              `}).join('')}
            </div>
          </div>
        ` : ''}
        ${showSwitcher && versions.length === 1 ? `
          <span class="sp-feedback-divider">|</span>
          <span class="sp-version-indicator" title="${sanitizeHTML(currentDescription)}">
            Blokkskjema: ${sanitizeHTML(this.dataHandler.formatVersionId(currentVersion))}
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
    // Get programs from API (school.programs) or fallback to defaults
    const programs = this.dataHandler.getSchoolPrograms();
    const selectedProgram = programs.find(p => p.id === currentState.programomrade) || programs[0];

    // Trinn options
    const trinnOptions = [
      { id: 'vg1', name: 'VG1' },
      { id: 'vg2', name: 'VG2' }
    ];
    const selectedTrinn = trinnOptions.find(t => t.id === currentState.trinn) || trinnOptions[0];

    // Fremmedsprak options
    const fremmedsprakOptions = [
      { id: 'true', name: 'Ja' },
      { id: 'false', name: 'Nei' }
    ];
    const selectedFremmedsprak = currentState.harFremmedsprak ? fremmedsprakOptions[0] : fremmedsprakOptions[1];

    return `
      <div class="sp-filter-section">
        <div class="sp-filter-row">
          <div class="sp-filter-dropdown" data-dropdown="trinn">
            <button class="sp-filter-dropdown-btn" aria-haspopup="listbox" aria-expanded="false">
              <span class="sp-filter-dropdown-label">Trinn:</span>
              <span class="sp-filter-dropdown-value">${sanitizeHTML(selectedTrinn.name)}</span>
              <span class="sp-filter-dropdown-arrow">▾</span>
            </button>
            <div class="sp-filter-dropdown-menu hidden" role="listbox">
              ${trinnOptions.map(trinn => `
                <button class="sp-filter-dropdown-item ${currentState.trinn === trinn.id ? 'selected' : ''}"
                        data-trinn="${sanitizeHTML(trinn.id)}"
                        role="option"
                        aria-selected="${currentState.trinn === trinn.id}">
                  ${sanitizeHTML(trinn.name)}
                </button>
              `).join('')}
            </div>
          </div>
          <span class="sp-filter-divider"></span>
          <div class="sp-filter-dropdown" data-dropdown="program">
            <button class="sp-filter-dropdown-btn" aria-haspopup="listbox" aria-expanded="false">
              <span class="sp-filter-dropdown-label">Program:</span>
              <span class="sp-filter-dropdown-value">${sanitizeHTML(selectedProgram?.name || 'Velg')}</span>
              <span class="sp-filter-dropdown-arrow">▾</span>
            </button>
            <div class="sp-filter-dropdown-menu hidden" role="listbox">
              ${programs.map(program => `
                <button class="sp-filter-dropdown-item ${currentState.programomrade === program.id ? 'selected' : ''}"
                        data-programomrade="${sanitizeHTML(program.id)}"
                        role="option"
                        aria-selected="${currentState.programomrade === program.id}">
                  ${sanitizeHTML(program.name)}
                </button>
              `).join('')}
            </div>
          </div>
          <span class="sp-filter-divider"></span>
          <div class="sp-filter-dropdown" data-dropdown="fremmedsprak">
            <button class="sp-filter-dropdown-btn" aria-haspopup="listbox" aria-expanded="false">
              <span class="sp-filter-dropdown-label">Fremmedsprak pa ungdomsskolen:</span>
              <span class="sp-filter-dropdown-value">${sanitizeHTML(selectedFremmedsprak.name)}</span>
              <span class="sp-filter-dropdown-arrow">▾</span>
            </button>
            <div class="sp-filter-dropdown-menu hidden" role="listbox">
              ${fremmedsprakOptions.map(option => `
                <button class="sp-filter-dropdown-item ${(currentState.harFremmedsprak ? 'true' : 'false') === option.id ? 'selected' : ''}"
                        data-fremmedsprak="${sanitizeHTML(option.id)}"
                        role="option"
                        aria-selected="${(currentState.harFremmedsprak ? 'true' : 'false') === option.id}">
                  ${sanitizeHTML(option.name)}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="sp-filter-spacer"></div>
          <button class="sp-fjern-valg-btn sp-fjern-valg-btn-sm active">
            Nullstill
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render validation stripe at bottom of each trinn column
   */
  renderTrinnValidation(trinn, validation) {
    const trinnLabels = {
      'vg1': 'VG1',
      'vg2': 'VG2',
      'vg3': 'VG3'
    };

    const isComplete = validation[`${trinn}Complete`];
    const messages = validation[`${trinn}Messages`] || [];
    const label = trinnLabels[trinn];

    // Get missing count for incomplete state
    let statusText = '';
    if (isComplete) {
      statusText = `${label} er komplett`;
    } else {
      // Extract missing count from messages if available
      const missingMsg = messages.find(m => m.includes('fag til'));
      if (missingMsg) {
        statusText = missingMsg.replace('Velg ', '').replace(' fag til', ' mangler');
      } else {
        statusText = `${label} er ikke komplett`;
      }
    }

    return `
      <div class="sp-trinn-validation ${isComplete ? 'complete' : 'incomplete'}">
        <div class="sp-trinn-validation-icon">${isComplete ? '✓' : '!'}</div>
        <div class="sp-trinn-validation-text">${statusText}</div>
      </div>
    `;
  }

  /**
   * Render completion message when all trinns are valid
   */
  renderCompletionMessage() {
    const validation = this.state.validate();

    if (!validation.isComplete) return '';

    return `
      <div class="sp-completion-message">
        <div class="sp-completion-icon">✓</div>
        <div class="sp-completion-content">
          <div class="sp-completion-title">Du har nå lagt inn et gyldig fagvalg!</div>
          <div class="sp-completion-text">
            Merk at dette kun er et planleggingsverktøy og at det endelige fagvalget skal gjennomføres i InSchool!
          </div>
          <button class="sp-completion-btn sp-print-btn">
            Skriv ut eller lagre studieplanen din
          </button>
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
      ${this.renderCompletionMessage()}
    `;
  }

  /**
   * Render VG1 column
   */
  renderVG1() {
    const currentState = this.state.getState();
    const fellesfag = this.dataHandler.getFellesfag(currentState.programomrade, 'vg1');
    const fellesProgramfag = this.dataHandler.getFellesProgramfag(currentState.programomrade, 'vg1');
    const validation = this.state.validate();

    return `
      <div class="sp-vg-column">
        <div class="sp-vg-header">
          VG1
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

          ${this.renderTrinnValidation('vg1', validation)}
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
      // Add type-specific class for color coding
      const extraClass = type === 'matematikk' ? ' matematikk' : (type === 'fremmedsprak' ? ' fremmedsprak' : '');
      return `
        <div class="sp-fag-item selected${extraClass} sp-vg1-${type}-slot" data-type="${type}">
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
    const validation = this.state.validate();

    return `
      <div class="sp-vg-column">
        <div class="sp-vg-header">
          VG2
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

          ${this.renderVG2ProgramfagOgMatematikk()}

          ${this.renderTrinnValidation('vg2', validation)}
        </div>
      </div>
    `;
  }

  /**
   * Render VG2 programfag og matematikk combined section
   * Studiespesialisering: 4 bokser (3 programfag + 1 matematikk)
   * Musikk/Medier: 2 bokser (1 programfag + 1 matematikk)
   */
  renderVG2ProgramfagOgMatematikk() {
    const currentState = this.state.getState();
    const programomrade = currentState.programomrade;

    // Get matematikk selection
    const matematikk = this.state.getVG2Matematikk();

    // Get programfag selections (excluding matematikk slot)
    let programfag = [];
    if (currentState.vg2 && currentState.vg2.selections) {
      programfag = currentState.vg2.selections.filter(s => {
        return s.slot && s.slot.startsWith('programfag-');
      });
    }

    // Calculate number of programfag slots based on program (from school-data)
    // Studiespesialisering: 3 valgfrie programfag (420t / 140t)
    // Musikk-dans-drama: 1 valgfritt programfag (140t / 140t)
    // Medier-kommunikasjon: 1 valgfritt programfag (140t / 140t)
    let programfagSlots;
    if (programomrade === 'studiespesialisering') {
      programfagSlots = 3;
    } else if (programomrade === 'musikk-dans-drama') {
      programfagSlots = 1;
    } else if (programomrade === 'medier-kommunikasjon') {
      programfagSlots = 1;
    } else {
      programfagSlots = 3; // default
    }
    const totalSlots = programfagSlots + 1; // +1 for matematikk

    const slots = [];

    // Add programfag slots (antall varierer per programomrade)
    for (let i = 0; i < programfagSlots; i++) {
      if (programfag[i]) {
        slots.push(`
          <div class="sp-fag-item selected">
            <div class="sp-fag-item-title">${sanitizeHTML(programfag[i].navn)}</div>
            <div class="sp-fag-item-meta">
              <div class="sp-fag-item-timer">${programfag[i].timer}t</div>
              <button class="sp-fag-item-info" data-fag-id="${sanitizeHTML(programfag[i].id)}" title="Se fagdetaljer" aria-label="Se detaljer for ${sanitizeHTML(programfag[i].navn)}">
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
            <div class="sp-fag-item-title">Klikk for a velge programfag</div>
          </div>
        `);
      }
    }

    // Add matematikk slot (with matematikk class for purple color)
    if (matematikk) {
      slots.push(`
        <div class="sp-fag-item selected matematikk">
          <div class="sp-fag-item-title">${sanitizeHTML(matematikk.navn)}</div>
          <div class="sp-fag-item-meta">
            <div class="sp-fag-item-timer">${matematikk.timer}t</div>
            <button class="sp-fag-item-info" data-fag-id="${sanitizeHTML(matematikk.id)}" title="Se fagdetaljer" aria-label="Se detaljer for ${sanitizeHTML(matematikk.navn)}">
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
          <div class="sp-fag-item-title">Klikk for a velge matematikk</div>
        </div>
      `);
    }

    return `
      <div class="sp-fag-section sp-programfag-gruppe" data-trinn="vg2">
        <div class="sp-fag-section-title">Programfag og matematikk (klikk for a velge)</div>
        ${slots.join('')}
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
    const validation = this.state.validate();

    // Filter out Historie from fellesfag (it will be in the combined section)
    const fellesfag = allFellesfag.filter(f => f.fagkode !== 'HIS1010' && f.navn !== 'Historie');

    return `
      <div class="sp-vg-column">
        <div class="sp-vg-header">
          VG3
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

          ${this.renderVG3ProgramfagOgHistorie()}

          ${this.renderTrinnValidation('vg3', validation)}
        </div>
      </div>
    `;
  }

  /**
   * Render VG3 programfag og historie combined section
   * Studiespesialisering: 4 bokser (3 programfag + 1 historie)
   * Musikk: 2 bokser (1 programfag + 1 historie)
   * Medier: 3 bokser (2 programfag + 1 historie)
   */
  renderVG3ProgramfagOgHistorie() {
    const currentState = this.state.getState();
    const programomrade = currentState.programomrade;
    const allFellesfag = this.dataHandler.getFellesfag(programomrade, 'vg3');

    // Get historie info from fellesfag
    const historieInfo = allFellesfag.find(f => f.fagkode === 'HIS1010' || f.navn === 'Historie');

    // Check if historie has been selected in blokkskjema
    const selectedHistorie = currentState.vg3.selections
      ? currentState.vg3.selections.find(f =>
          f.fagkode === 'HIS1010' || f.id === 'historie-vg3' || f.slot === 'historie'
        )
      : null;

    // Get programfag selections (excluding historie slot)
    let programfag = [];
    if (currentState.vg3 && currentState.vg3.selections) {
      programfag = currentState.vg3.selections.filter(s => {
        return s.slot && s.slot.startsWith('programfag-');
      });
    }

    // Calculate number of programfag slots based on program
    // Studiespesialisering: 4 total (3 programfag + 1 historie)
    // Musikk: 2 total (1 programfag + 1 historie)
    // Medier: 3 total (2 programfag + 1 historie)
    let programfagSlots;
    if (programomrade === 'studiespesialisering') {
      programfagSlots = 3;
    } else if (programomrade === 'musikk-dans-drama') {
      programfagSlots = 1;
    } else if (programomrade === 'medier-kommunikasjon') {
      programfagSlots = 2;
    } else {
      programfagSlots = 3; // default
    }

    const slots = [];

    // Add programfag slots
    for (let i = 0; i < programfagSlots; i++) {
      if (programfag[i]) {
        slots.push(`
          <div class="sp-fag-item selected">
            <div class="sp-fag-item-title">${sanitizeHTML(programfag[i].navn)}</div>
            <div class="sp-fag-item-meta">
              <div class="sp-fag-item-timer">${programfag[i].timer}t</div>
              <button class="sp-fag-item-info" data-fag-id="${sanitizeHTML(programfag[i].id)}" title="Se fagdetaljer" aria-label="Se detaljer for ${sanitizeHTML(programfag[i].navn)}">
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
            <div class="sp-fag-item-title">Klikk for a velge programfag</div>
          </div>
        `);
      }
    }

    // Add historie slot (with historie class for orange color)
    if (selectedHistorie) {
      const timer = historieInfo?.timer || 113;
      slots.push(`
        <div class="sp-fag-item selected historie">
          <div class="sp-fag-item-title">Historie</div>
          <div class="sp-fag-item-meta">
            <div class="sp-fag-item-timer">${timer}t</div>
            <button class="sp-fag-item-info" data-fag-id="${historieInfo?.id || 'historie-vg3'}" title="Se fagdetaljer" aria-label="Se detaljer for Historie">
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
        <div class="sp-fag-item empty-slot historie-obligatorisk">
          <div class="sp-fag-item-title">Klikk for a velge historie</div>
        </div>
      `);
    }

    return `
      <div class="sp-fag-section sp-programfag-gruppe" data-trinn="vg3">
        <div class="sp-fag-section-title">Programfag og historie (klikk for a velge)</div>
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
      ${this.renderCatalogModal()}
      ${this.renderOnboardingModal()}
    `;
  }

  /**
   * Render onboarding modal for first-time users
   */
  renderOnboardingModal() {
    // Get programs from API for the dropdown
    const programs = this.dataHandler.getSchoolPrograms();

    return `
      <div class="sp-modal sp-modal-onboarding" style="display: none;">
        <div class="sp-modal-content sp-modal-onboarding-content">
          <div class="sp-modal-header">
            <h2 class="sp-modal-title">Velkommen til Studieplanleggeren</h2>
            <p class="sp-modal-subtitle">Svar pa tre korte sporsmal for a komme i gang</p>
          </div>

          <div class="sp-onboarding-form">
            <div class="sp-onboarding-question">
              <label class="sp-onboarding-label">1. Hvilket trinn gar du pa i dag?</label>
              <div class="sp-onboarding-options" data-question="trinn">
                <button class="sp-onboarding-option" data-value="vg1">VG1</button>
                <button class="sp-onboarding-option" data-value="vg2">VG2</button>
              </div>
            </div>

            <div class="sp-onboarding-question">
              <label class="sp-onboarding-label">2. Hvilket programomrade gar du pa?</label>
              <div class="sp-onboarding-options" data-question="programomrade">
                ${programs.map(program => `
                  <button class="sp-onboarding-option" data-value="${sanitizeHTML(program.id)}">
                    ${sanitizeHTML(program.name)}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="sp-onboarding-question">
              <label class="sp-onboarding-label">3. Hadde du fremmedsprak pa ungdomsskolen?</label>
              <div class="sp-onboarding-options" data-question="fremmedsprak">
                <button class="sp-onboarding-option" data-value="true">Ja</button>
                <button class="sp-onboarding-option" data-value="false">Nei</button>
              </div>
            </div>
          </div>

          <div class="sp-modal-footer">
            <div class="sp-onboarding-status">
              <span class="sp-onboarding-progress">0 av 3 valgt</span>
            </div>
            <div class="sp-modal-actions">
              <button class="sp-btn sp-btn-primary sp-onboarding-submit" disabled>Kom i gang</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render catalog modal for browsing all subjects
   */
  renderCatalogModal() {
    return `
      <div class="sp-modal sp-modal-catalog" style="display: none;">
        <div class="sp-modal-content sp-modal-catalog-content">
          <button class="sp-modal-close">×</button>

          <div class="sp-modal-header">
            <h2 class="sp-modal-title">Fagkatalog</h2>
            <p class="sp-modal-subtitle">Utforsk alle tilgjengelige programfag</p>
          </div>

          <div class="sp-catalog-search">
            <input type="text" class="sp-catalog-search-input" placeholder="Søk etter fag..." aria-label="Søk i fagkatalog">
          </div>

          <div class="sp-catalog-filters">
            <button class="sp-catalog-filter-btn active" data-filter="alle">Alle fag</button>
            <button class="sp-catalog-filter-btn" data-filter="realfag">Realfag</button>
            <button class="sp-catalog-filter-btn" data-filter="matematikk">Matematikk</button>
            <button class="sp-catalog-filter-btn" data-filter="sprak">Språkfag</button>
            <button class="sp-catalog-filter-btn" data-filter="samfunn">Samfunnsfag</button>
            <button class="sp-catalog-filter-btn" data-filter="okonomi">Økonomi</button>
            <button class="sp-catalog-filter-btn" data-filter="mediefag">Mediefag</button>
            <button class="sp-catalog-filter-btn" data-filter="musikkfag">Musikkfag</button>
          </div>

          <div class="sp-catalog-content" id="catalog-content">
            <!-- Will be populated dynamically -->
          </div>

          <div class="sp-modal-footer">
            <div class="sp-modal-actions">
              <button class="sp-btn sp-btn-secondary">Lukk</button>
              <span class="sp-feedback-divider">|</span>
              <a href="https://forms.office.com/e/Y7ekhKc9GD" target="_blank" rel="noopener" class="sp-feedback-link">
                Gi tilbakemelding
              </a>
            </div>
          </div>
        </div>
      </div>
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
              <div class="sp-vg1-fag-item ${type}" data-fagkode="${f.fagkode}" data-timer="${f.timer}"${f.lareplan ? ` data-lareplan="${f.lareplan}"` : ''}>
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
