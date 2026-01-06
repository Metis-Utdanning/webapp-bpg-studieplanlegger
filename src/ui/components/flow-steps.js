/**
 * Flow Step Components
 *
 * Fullscreen step-based UI for subject selection:
 * - VG1Step: Side-by-side cards for Matematikk + Fremmedspråk
 * - VG2Step: Blokkskjema-based selection
 * - VG3Step: Blokkskjema-based selection
 */

/**
 * Base Step class with common functionality
 */
class BaseStep {
  constructor(container, options = {}) {
    this.container = container;
    this.state = options.state;
    this.dataHandler = options.dataHandler;
    this.flowController = options.flowController;
    this.onComplete = options.onComplete || (() => {});
    this.onBack = options.onBack || (() => {});
    this.onReset = options.onReset || (() => {});
  }

  /**
   * Render the step container
   */
  renderContainer(title, subtitle, content) {
    return `
      <div class="sp-v2-step-screen">
        <div class="sp-v2-step-screen__header">
          <h2 class="sp-v2-step-screen__title">${title}</h2>
          ${subtitle ? `<p class="sp-v2-step-screen__subtitle">${subtitle}</p>` : ''}
        </div>
        <div class="sp-v2-step-screen__content">
          ${content}
        </div>
        <div class="sp-v2-step-screen__footer">
          ${this.renderNavigation()}
        </div>
      </div>
    `;
  }

  /**
   * Render navigation buttons
   */
  renderNavigation() {
    const validation = this.getValidation();
    const canProceed = validation.isValid;
    const flowState = this.flowController.getFlowState();
    const isFirstStep = flowState.currentStep === 0;

    return `
      <div class="sp-v2-step-nav">
        ${isFirstStep ? `
          <button class="sp-v2-btn sp-v2-btn--ghost sp-v2-step-reset" title="Start på nytt">
            <span class="sp-v2-btn-icon">↺</span> Nullstill
          </button>
        ` : `
          <button class="sp-v2-btn sp-v2-btn--secondary sp-v2-step-back">
            <span class="sp-v2-btn-icon">←</span> Tilbake
          </button>
        `}
        <div class="sp-v2-step-nav__progress">
          ${validation.message || ''}
        </div>
        <button class="sp-v2-btn sp-v2-btn--primary sp-v2-btn--large sp-v2-step-next" ${!canProceed ? 'disabled' : ''}>
          Neste <span class="sp-v2-btn-icon">→</span>
        </button>
      </div>
    `;
  }

  /**
   * Get validation state - override in subclasses
   */
  getValidation() {
    return { isValid: true, message: '' };
  }

  /**
   * Attach common event listeners
   */
  attachCommonListeners() {
    const backBtn = this.container.querySelector('.sp-v2-step-back');
    const nextBtn = this.container.querySelector('.sp-v2-step-next');
    const resetBtn = this.container.querySelector('.sp-v2-step-reset');

    if (backBtn) {
      backBtn.addEventListener('click', () => this.onBack());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.onReset());
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.getValidation().isValid) {
          this.onComplete();
        }
      });
    }
  }

  /**
   * Update navigation state
   */
  updateNavigation() {
    const validation = this.getValidation();
    const nextBtn = this.container.querySelector('.sp-v2-step-next');
    const progressEl = this.container.querySelector('.sp-v2-step-nav__progress');

    if (nextBtn) {
      nextBtn.disabled = !validation.isValid;
    }

    if (progressEl) {
      progressEl.innerHTML = validation.message || '';
    }
  }
}

/**
 * VG1 Step - Matematikk and Fremmedspråk selection
 */
export class VG1Step extends BaseStep {
  constructor(container, options = {}) {
    super(container, options);
    this.selectedMath = null;
    this.selectedLanguage = null;
  }

  render() {
    const stateData = this.state.getState();
    const mathOptions = this.dataHandler.getVG1Matematikk();
    const languageOptions = this.dataHandler.getVG1Fremmedsprak(stateData.harFremmedsprak);

    // Get current selections
    this.selectedMath = this.state.getSelection('vg1', 'matematikk');
    this.selectedLanguage = this.state.getSelection('vg1', 'fremmedsprak');

    const content = `
      <div class="sp-v2-vg1-grid">
        <!-- Matematikk Section -->
        <div class="sp-v2-vg1-section" data-section="matematikk">
          <div class="sp-v2-vg1-section__header">
            <div class="sp-v2-vg1-section__icon">∑</div>
            <div class="sp-v2-vg1-section__title">Matematikk</div>
            <div class="sp-v2-vg1-section__hint">Velg 1P eller 1T</div>
          </div>
          <div class="sp-v2-vg1-options">
            ${mathOptions.map(opt => this.renderMathOption(opt)).join('')}
          </div>
        </div>

        <!-- Fremmedspråk Section -->
        <div class="sp-v2-vg1-section" data-section="fremmedsprak">
          <div class="sp-v2-vg1-section__header">
            <div class="sp-v2-vg1-section__icon">🌍</div>
            <div class="sp-v2-vg1-section__title">Fremmedspråk</div>
            <div class="sp-v2-vg1-section__hint">
              ${stateData.harFremmedsprak ? 'Fortsett eller start nytt språk' : 'Start fremmedspråk (3-årig)'}
            </div>
          </div>
          <div class="sp-v2-vg1-options sp-v2-vg1-options--language">
            ${languageOptions.map(opt => this.renderLanguageOption(opt)).join('')}
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = this.renderContainer(
      'VG1 - Velg fellesfag',
      'Disse fagene følger deg gjennom hele videregående',
      content
    );

    this.attachEventListeners();
  }

  renderMathOption(option) {
    const isSelected = this.selectedMath?.id === option.id;
    const description = option.id === 'matematikk-1t'
      ? 'Teoretisk retning - anbefalt for realfag'
      : 'Praktisk retning - anbefalt for økonomi/samfunn';

    return `
      <div class="sp-v2-vg1-option ${isSelected ? 'sp-v2-vg1-option--selected' : ''}"
           data-type="matematikk"
           data-id="${option.id}"
           data-navn="${option.navn}"
           data-timer="${option.timer}"
           data-fagkode="${option.fagkode || ''}"
           tabindex="0">
        <div class="sp-v2-vg1-option__radio">
          ${isSelected ? '<span class="sp-v2-vg1-option__check">✓</span>' : ''}
        </div>
        <div class="sp-v2-vg1-option__content">
          <div class="sp-v2-vg1-option__name">${option.navn}</div>
          <div class="sp-v2-vg1-option__description">${description}</div>
          <div class="sp-v2-vg1-option__hours">${option.timer} timer</div>
        </div>
      </div>
    `;
  }

  renderLanguageOption(option) {
    const isSelected = this.selectedLanguage?.id === option.id;
    const description = option.merknad || this.getLanguageDescription(option.id);

    return `
      <div class="sp-v2-vg1-option ${isSelected ? 'sp-v2-vg1-option--selected' : ''}"
           data-type="fremmedsprak"
           data-id="${option.id}"
           data-navn="${option.navn}"
           data-timer="${option.timer}"
           data-fagkode="${option.fagkode || ''}"
           tabindex="0">
        <div class="sp-v2-vg1-option__radio">
          ${isSelected ? '<span class="sp-v2-vg1-option__check">✓</span>' : ''}
        </div>
        <div class="sp-v2-vg1-option__content">
          <div class="sp-v2-vg1-option__name">${option.navn}</div>
          ${description ? `<div class="sp-v2-vg1-option__description">${description}</div>` : ''}
          <div class="sp-v2-vg1-option__hours">${option.timer} timer</div>
        </div>
      </div>
    `;
  }

  getLanguageDescription(id) {
    if (id.includes('-ii-') || id.endsWith('-ii')) {
      return 'Nivå II - fortsettelse fra ungdomsskolen';
    }
    if (id.includes('-i-ii') || id.includes('i-ii')) {
      return 'Nivå I+II - 3-årig løp';
    }
    if (id.includes('-i-') || id.endsWith('-i')) {
      return 'Nivå I - start nytt språk';
    }
    return '';
  }

  attachEventListeners() {
    this.attachCommonListeners();

    // Option clicks
    this.container.querySelectorAll('.sp-v2-vg1-option').forEach(option => {
      option.addEventListener('click', (e) => this.handleOptionClick(e));
      option.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleOptionClick(e);
        }
      });
    });
  }

  handleOptionClick(e) {
    const option = e.currentTarget;
    const type = option.dataset.type;
    const selection = {
      id: option.dataset.id,
      navn: option.dataset.navn,
      timer: option.dataset.timer,
      fagkode: option.dataset.fagkode
    };

    // Update state
    this.state.setVG1Subject(type, selection);

    // Update local tracking
    if (type === 'matematikk') {
      this.selectedMath = selection;
    } else {
      this.selectedLanguage = selection;
    }

    // Update visual state
    const section = option.closest('.sp-v2-vg1-section');
    section.querySelectorAll('.sp-v2-vg1-option').forEach(opt => {
      opt.classList.remove('sp-v2-vg1-option--selected');
      opt.querySelector('.sp-v2-vg1-option__radio').innerHTML = '';
    });
    option.classList.add('sp-v2-vg1-option--selected');
    option.querySelector('.sp-v2-vg1-option__radio').innerHTML = '<span class="sp-v2-vg1-option__check">✓</span>';

    // Update navigation
    this.updateNavigation();

    // Auto-advance if both selected
    if (this.selectedMath && this.selectedLanguage) {
      setTimeout(() => {
        if (this.getValidation().isValid) {
          this.onComplete();
        }
      }, 400);
    }
  }

  getValidation() {
    const hasMath = this.selectedMath !== null;
    const hasLang = this.selectedLanguage !== null;
    const isValid = hasMath && hasLang;

    let message = '';
    if (!hasMath && !hasLang) {
      message = '<span class="sp-v2-badge sp-v2-badge--warning">Velg matematikk og fremmedspråk</span>';
    } else if (!hasMath) {
      message = '<span class="sp-v2-badge sp-v2-badge--warning">Velg matematikk</span>';
    } else if (!hasLang) {
      message = '<span class="sp-v2-badge sp-v2-badge--warning">Velg fremmedspråk</span>';
    } else {
      message = '<span class="sp-v2-badge sp-v2-badge--success">Begge valgt ✓</span>';
    }

    return { isValid, message };
  }
}

/**
 * Blokkskjema Step - For VG2 and VG3 selection
 */
export class BlokkskjemaStep extends BaseStep {
  constructor(container, options = {}) {
    super(container, options);
    this.trinn = options.trinn || 'vg2';
    this.isProjection = options.isProjection || false;
    this.isRetrospective = options.isRetrospective || false;
    this.selectedFag = new Map(); // blokkId -> fag
  }

  render() {
    const stateData = this.state.getState();
    const programomrade = stateData.programomrade;
    const blokkerData = this.dataHandler.getFagForProgramOgTrinn(programomrade, this.trinn);

    // Load existing selections
    this.loadExistingSelections();

    const title = this.getStepTitle();
    const subtitle = this.getStepSubtitle();

    const content = `
      ${this.isProjection ? this.renderProjectionBanner() : ''}
      ${this.isRetrospective ? this.renderRetrospectiveBanner() : ''}

      <div class="sp-v2-blokkskjema">
        <div class="sp-v2-blokkskjema__header">
          <div class="sp-v2-blokkskjema__summary">
            ${this.renderSummary()}
          </div>
        </div>

        <div class="sp-v2-blokkskjema__blokker">
          ${Object.entries(blokkerData).map(([blokkId, blokk]) =>
            this.renderBlokk(blokkId, blokk)
          ).join('')}
        </div>
      </div>
    `;

    this.container.innerHTML = this.renderContainer(title, subtitle, content);
    this.attachEventListeners();
  }

  getStepTitle() {
    const trinnUpper = this.trinn.toUpperCase();
    if (this.isProjection) {
      return `${trinnUpper} - Projeksjon`;
    }
    if (this.isRetrospective) {
      return `${trinnUpper} - Angi dine fag`;
    }
    return `${trinnUpper} - Velg programfag`;
  }

  getStepSubtitle() {
    if (this.isProjection) {
      return 'Utforsk mulige fag for VG3 - dette er tentativt';
    }
    if (this.isRetrospective) {
      return 'Velg fagene du har/hadde dette året';
    }
    const requiredCount = this.trinn === 'vg2' ? 4 : 4;
    return `Velg ${requiredCount} fag fra blokkskjemaet`;
  }

  renderProjectionBanner() {
    return `
      <div class="sp-v2-info-banner sp-v2-info-banner--projection">
        <div class="sp-v2-info-banner__icon">🔮</div>
        <div class="sp-v2-info-banner__content">
          <div class="sp-v2-info-banner__title">Dette er en projeksjon</div>
          <div class="sp-v2-info-banner__text">
            Valgene du gjør her er tentative. Du velger offisielt når du går i VG2.
          </div>
        </div>
      </div>
    `;
  }

  renderRetrospectiveBanner() {
    return `
      <div class="sp-v2-info-banner sp-v2-info-banner--retrospective">
        <div class="sp-v2-info-banner__icon">📝</div>
        <div class="sp-v2-info-banner__content">
          <div class="sp-v2-info-banner__title">Tilbakeblikk</div>
          <div class="sp-v2-info-banner__text">
            Angi fagene du ${this.trinn === 'vg2' ? 'har' : 'hadde'} for å få riktige forslag for VG3.
          </div>
        </div>
      </div>
    `;
  }

  renderSummary() {
    const count = this.selectedFag.size;
    const required = this.getRequiredCount();
    const percentage = Math.min((count / required) * 100, 100);

    return `
      <div class="sp-v2-selection-summary">
        <div class="sp-v2-selection-summary__count">
          <span class="sp-v2-selection-summary__number">${count}</span>
          <span class="sp-v2-selection-summary__of">/ ${required}</span>
          <span class="sp-v2-selection-summary__label">fag valgt</span>
        </div>
        <div class="sp-v2-progress-bar sp-v2-progress-bar--large">
          <div class="sp-v2-progress-bar__fill" style="width: ${percentage}%"></div>
        </div>
        <div class="sp-v2-selection-summary__selected">
          ${this.renderSelectedTags()}
        </div>
      </div>
    `;
  }

  renderSelectedTags() {
    if (this.selectedFag.size === 0) {
      return '<span class="sp-v2-selection-summary__empty">Klikk på fag for å velge</span>';
    }

    return Array.from(this.selectedFag.values()).map(fag => `
      <span class="sp-v2-tag sp-v2-tag--selected" data-fag-id="${fag.id}">
        ${fag.navn}
        <button class="sp-v2-tag__remove" data-blokkid="${fag.blokkId}">×</button>
      </span>
    `).join('');
  }

  renderBlokk(blokkId, blokk) {
    const selectedInBlokk = this.selectedFag.get(blokkId);

    return `
      <div class="sp-v2-blokk ${selectedInBlokk ? 'sp-v2-blokk--has-selection' : ''}" data-blokk-id="${blokkId}">
        <div class="sp-v2-blokk__header">
          <div class="sp-v2-blokk__name">${blokk.navn}</div>
          ${selectedInBlokk ? `
            <div class="sp-v2-blokk__selected">
              <span class="sp-v2-blokk__selected-name">${selectedInBlokk.navn}</span>
              <button class="sp-v2-blokk__clear" title="Fjern valg">×</button>
            </div>
          ` : ''}
        </div>
        <div class="sp-v2-blokk__fag">
          ${blokk.fag.map(fag => this.renderFag(fag, blokkId, selectedInBlokk)).join('')}
        </div>
      </div>
    `;
  }

  renderFag(fag, blokkId, selectedInBlokk) {
    const isSelected = selectedInBlokk?.id === fag.id;
    const isDisabled = this.isFagDisabled(fag);
    const status = this.getFagStatus(fag);

    let statusClass = '';
    let statusIcon = '';
    if (isSelected) {
      statusClass = 'sp-v2-fag--selected';
      statusIcon = '✓';
    } else if (isDisabled) {
      statusClass = 'sp-v2-fag--blocked';
      statusIcon = '⊘';
    } else if (status.warning) {
      statusClass = 'sp-v2-fag--warning';
      statusIcon = '⚠';
    }

    return `
      <div class="sp-v2-fag ${statusClass}"
           data-fag-id="${fag.id}"
           data-blokk-id="${blokkId}"
           data-navn="${fag.title || fag.id}"
           data-timer="${fag.timer}"
           data-fagkode="${fag.fagkode || ''}"
           ${isDisabled ? 'data-disabled="true"' : ''}
           tabindex="${isDisabled ? '-1' : '0'}">
        <div class="sp-v2-fag__indicator">
          ${statusIcon}
        </div>
        <div class="sp-v2-fag__content">
          <div class="sp-v2-fag__name">${fag.title || fag.id}</div>
          <div class="sp-v2-fag__meta">
            <span class="sp-v2-fag__hours">${fag.timer}t</span>
            ${fag.fagkode ? `<span class="sp-v2-fag__code">${fag.fagkode}</span>` : ''}
          </div>
        </div>
        ${status.tooltip ? `<div class="sp-v2-fag__tooltip">${status.tooltip}</div>` : ''}
      </div>
    `;
  }

  loadExistingSelections() {
    const selections = this.state.getSelections(this.trinn);
    this.selectedFag.clear();

    selections.forEach(sel => {
      if (sel.blokkId) {
        this.selectedFag.set(sel.blokkId, {
          id: sel.id,
          navn: sel.navn,
          timer: sel.timer,
          fagkode: sel.fagkode,
          blokkId: sel.blokkId
        });
      }
    });
  }

  isFagDisabled(fag) {
    // Check exclusions
    const selectedIds = Array.from(this.selectedFag.values()).map(f => f.id);
    const exclusion = this.dataHandler.isExcludedBy(fag.id, selectedIds);
    return exclusion.excluded;
  }

  getFagStatus(fag) {
    // Check prerequisites
    const prereq = this.dataHandler.getPrerequisiteFor(fag.id);
    if (prereq) {
      const allSelectedIds = this.state.getAllSelectedFagIds();
      const hasPrereq = allSelectedIds.includes(prereq.kreverFag);
      if (!hasPrereq) {
        return {
          warning: true,
          tooltip: `Anbefaler: ${prereq.kreverFag} først`
        };
      }
    }
    return {};
  }

  getRequiredCount() {
    // VG2: matematikk + 3 programfag = 4
    // VG3: historie + 3 programfag = 4
    return 4;
  }

  attachEventListeners() {
    this.attachCommonListeners();

    // Fag clicks
    this.container.querySelectorAll('.sp-v2-fag:not([data-disabled="true"])').forEach(fagEl => {
      fagEl.addEventListener('click', (e) => this.handleFagClick(e));
      fagEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleFagClick(e);
        }
      });
    });

    // Clear buttons
    this.container.querySelectorAll('.sp-v2-blokk__clear').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const blokkId = btn.closest('.sp-v2-blokk').dataset.blokkId;
        this.clearBlokkSelection(blokkId);
      });
    });

    // Tag remove buttons
    this.container.querySelectorAll('.sp-v2-tag__remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const blokkId = btn.dataset.blokkid;
        this.clearBlokkSelection(blokkId);
      });
    });
  }

  handleFagClick(e) {
    const fagEl = e.currentTarget;
    const blokkId = fagEl.dataset.blokkId;
    const fagId = fagEl.dataset.fagId;

    // If already selected, deselect
    const currentSelection = this.selectedFag.get(blokkId);
    if (currentSelection?.id === fagId) {
      this.clearBlokkSelection(blokkId);
      return;
    }

    // Select this fag
    const selection = {
      id: fagId,
      navn: fagEl.dataset.navn,
      timer: fagEl.dataset.timer,
      fagkode: fagEl.dataset.fagkode,
      blokkId: blokkId
    };

    this.selectedFag.set(blokkId, selection);
    this.saveSelections();
    this.render(); // Re-render to update all states
  }

  clearBlokkSelection(blokkId) {
    this.selectedFag.delete(blokkId);
    this.saveSelections();
    this.render();
  }

  saveSelections() {
    const selectionsArray = Array.from(this.selectedFag.values());
    this.state.setTrinnSelections(this.trinn, selectionsArray);
  }

  getValidation() {
    const count = this.selectedFag.size;
    const required = this.getRequiredCount();
    const isValid = this.isRetrospective || this.isProjection ? true : count >= required;

    let message = '';
    if (count < required) {
      message = `<span class="sp-v2-badge sp-v2-badge--warning">${count}/${required} fag valgt</span>`;
    } else {
      message = `<span class="sp-v2-badge sp-v2-badge--success">${count}/${required} fag valgt ✓</span>`;
    }

    if (this.isRetrospective && count < required) {
      message += ' <span class="sp-v2-badge sp-v2-badge--info">Kan fortsette</span>';
    }

    return { isValid, message };
  }
}

/**
 * Step Renderer - Coordinates which step to show
 */
export class StepRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.state = options.state;
    this.dataHandler = options.dataHandler;
    this.flowController = options.flowController;
    this.onFlowComplete = options.onFlowComplete || (() => {});
    this.onReset = options.onReset || (() => {});

    this.currentStep = null;
  }

  /**
   * Render the current step based on flow state
   */
  render() {
    const flowState = this.flowController.getFlowState();
    const currentStepData = flowState.currentStepData;

    if (!currentStepData) {
      console.warn('No current step data');
      return;
    }

    // Clear container
    this.container.innerHTML = '';

    // Create step based on type
    const stepOptions = {
      state: this.state,
      dataHandler: this.dataHandler,
      flowController: this.flowController,
      onComplete: () => this.handleStepComplete(),
      onBack: () => this.handleStepBack(),
      onReset: () => this.onReset()
    };

    if (currentStepData.trinn === 'vg1') {
      this.currentStep = new VG1Step(this.container, stepOptions);
    } else {
      this.currentStep = new BlokkskjemaStep(this.container, {
        ...stepOptions,
        trinn: currentStepData.trinn,
        isProjection: currentStepData.isProjection || false,
        isRetrospective: currentStepData.type === 'retrospective'
      });
    }

    this.currentStep.render();
  }

  handleStepComplete() {
    const success = this.flowController.nextStep();
    if (success) {
      if (this.flowController.getFlowState().isComplete) {
        this.onFlowComplete();
      } else {
        this.render();
      }
    }
  }

  handleStepBack() {
    const success = this.flowController.previousStep();
    if (success) {
      this.render();
    }
  }
}
