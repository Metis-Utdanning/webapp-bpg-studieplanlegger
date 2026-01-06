/**
 * Flow Stepper Component
 *
 * Visual progress indicator showing:
 * VG1 → VG2 → VG3
 *
 * With states: active, completed, pending
 */

export class FlowStepper {
  constructor(container, flowController) {
    this.container = container;
    this.flowController = flowController;
  }

  /**
   * Render the stepper
   */
  render() {
    const flowState = this.flowController.getFlowState();
    const steps = flowState.steps;

    const html = `
      <div class="sp-v2-stepper" role="navigation" aria-label="Fagvalg-steg">
        ${steps.map((step, index) => this.renderStep(step, index, steps)).join('')}
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render a single step
   */
  renderStep(step, index, allSteps) {
    const stepClass = this.getStepClass(step);
    const isLastStep = index === allSteps.length - 1;

    return `
      <div class="sp-v2-step ${stepClass}"
           data-step-index="${index}"
           data-step-id="${step.id}"
           role="button"
           tabindex="${step.isComplete || step.isActive ? '0' : '-1'}"
           aria-current="${step.isActive ? 'step' : 'false'}"
           aria-disabled="${!step.isComplete && !step.isActive}">
        <div class="sp-v2-step__number">
          ${step.isComplete ? '' : index + 1}
        </div>
        <div class="sp-v2-step__content">
          <div class="sp-v2-step__label">${step.title}</div>
          ${step.isProjection ? '<span class="sp-v2-badge sp-v2-badge--info">Projeksjon</span>' : ''}
        </div>
      </div>
      ${!isLastStep ? this.renderConnector(step, allSteps[index + 1]) : ''}
    `;
  }

  /**
   * Render connector between steps
   */
  renderConnector(currentStep, nextStep) {
    const isCompleted = currentStep.isComplete;
    const connectorClass = isCompleted ? 'sp-v2-step-connector--completed' : '';

    return `<div class="sp-v2-step-connector ${connectorClass}"></div>`;
  }

  /**
   * Get CSS class for step state
   */
  getStepClass(step) {
    if (step.isActive) return 'sp-v2-step--active';
    if (step.isComplete) return 'sp-v2-step--completed';
    return 'sp-v2-step--disabled';
  }

  /**
   * Attach click handlers
   */
  attachEventListeners() {
    this.container.querySelectorAll('.sp-v2-step').forEach(stepEl => {
      stepEl.addEventListener('click', (e) => {
        const stepIndex = parseInt(e.currentTarget.dataset.stepIndex);
        this.flowController.goToStep(stepIndex);
      });

      // Keyboard navigation
      stepEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const stepIndex = parseInt(e.currentTarget.dataset.stepIndex);
          this.flowController.goToStep(stepIndex);
        }
      });
    });
  }

  /**
   * Update stepper without full re-render
   */
  update() {
    this.render();
  }
}

/**
 * Flow Navigation Component
 *
 * Previous / Next buttons at bottom of content
 */
export class FlowNavigation {
  constructor(container, flowController, options = {}) {
    this.container = container;
    this.flowController = flowController;
    this.onNext = options.onNext || (() => {});
    this.onPrevious = options.onPrevious || (() => {});
  }

  render() {
    const flowState = this.flowController.getFlowState();
    const validation = this.flowController.getStepValidation();
    const currentStep = flowState.currentStepData;

    const html = `
      <div class="sp-v2-flow-navigation">
        <div class="sp-v2-flow-navigation__left">
          ${flowState.canGoBack ? `
            <button class="sp-v2-btn sp-v2-btn--secondary sp-v2-flow-nav-prev">
              <span class="sp-v2-btn-icon">←</span>
              Tilbake
            </button>
          ` : ''}
        </div>

        <div class="sp-v2-flow-navigation__center">
          ${this.renderValidationSummary(validation, currentStep)}
        </div>

        <div class="sp-v2-flow-navigation__right">
          ${this.renderNextButton(flowState, validation)}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  renderValidationSummary(validation, currentStep) {
    if (!currentStep) return '';

    const { progress, warnings } = validation;

    // Show progress for current step
    let progressHtml = '';
    if (progress.required > 0) {
      const percentage = Math.round((progress.current / progress.required) * 100);
      progressHtml = `
        <div class="sp-v2-flow-progress">
          <span class="sp-v2-flow-progress__text">${progress.current}/${progress.required} valgt</span>
          <div class="sp-v2-progress-bar">
            <div class="sp-v2-progress-bar__fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    }

    // Show warnings for soft validation
    let warningsHtml = '';
    if (warnings.length > 0 && currentStep.softValidation) {
      warningsHtml = `
        <div class="sp-v2-flow-warnings">
          ${warnings.map(w => `<span class="sp-v2-badge sp-v2-badge--warning">${w}</span>`).join('')}
        </div>
      `;
    }

    return progressHtml + warningsHtml;
  }

  renderNextButton(flowState, validation) {
    const isLastStep = flowState.currentStep >= flowState.totalSteps - 1;
    const currentStep = flowState.currentStepData;
    const canProceed = flowState.canGoForward;

    let buttonText = 'Neste';
    let buttonClass = 'sp-v2-btn--primary';

    if (isLastStep) {
      buttonText = 'Fullfør';
      buttonClass = 'sp-v2-btn--accent';
    }

    // For projection step, show different text
    if (currentStep?.isProjection) {
      buttonText = 'Lagre projeksjon';
    }

    // For soft validation, allow proceeding with warning
    if (currentStep?.softValidation && !validation.isValid) {
      buttonText = 'Fortsett likevel';
    }

    return `
      <button class="sp-v2-btn ${buttonClass} sp-v2-btn--large sp-v2-flow-nav-next"
              ${!canProceed && !currentStep?.softValidation ? 'disabled' : ''}>
        ${buttonText}
        <span class="sp-v2-btn-icon">→</span>
      </button>
    `;
  }

  attachEventListeners() {
    const prevBtn = this.container.querySelector('.sp-v2-flow-nav-prev');
    const nextBtn = this.container.querySelector('.sp-v2-flow-nav-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.flowController.previousStep();
        this.onPrevious();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.flowController.nextStep()) {
          this.onNext();
        }
      });
    }
  }

  update() {
    this.render();
  }
}

/**
 * Onboarding Modal - Horizontal slide-based flow
 */
export class FlowOnboarding {
  constructor(options = {}) {
    this.onComplete = options.onComplete || (() => {});
    this.container = null;
    this.currentStep = 0;
    this.selections = {
      studentGrade: null,
      programomrade: null,
      harFremmedsprak: null
    };
    this.questions = ['studentGrade', 'programomrade', 'harFremmedsprak'];
  }

  show(parentContainer) {
    this.container = document.createElement('div');
    this.container.className = 'sp-v2-onboarding-overlay';
    this.container.innerHTML = this.renderModal();
    parentContainer.appendChild(this.container);

    requestAnimationFrame(() => {
      this.container.classList.add('sp-v2-onboarding-overlay--visible');
    });

    this.attachEventListeners();
  }

  renderModal() {
    return `
      <div class="sp-v2-onboarding-modal" role="dialog" aria-modal="true">
        <div class="sp-v2-wizard sp-v2-wizard--horizontal">
          <div class="sp-v2-wizard__header">
            <h1 class="sp-v2-wizard__title">Velkommen til Fagvelgeren</h1>
            <div class="sp-v2-wizard__progress-bar">
              <div class="sp-v2-wizard__progress-fill" style="width: 33%"></div>
            </div>
            <p class="sp-v2-wizard__step-label">Steg 1 av 3</p>
          </div>

          <div class="sp-v2-wizard__slider">
            <div class="sp-v2-wizard__slides" style="transform: translateX(0%)">

              <!-- Slide 1: Trinn -->
              <div class="sp-v2-wizard__slide" data-question="studentGrade">
                <div class="sp-v2-question__label">Hvilket trinn går du på nå?</div>
                <div class="sp-v2-options sp-v2-options--horizontal">
                  <div class="sp-v2-option sp-v2-option--card" data-value="vg1" tabindex="0">
                    <div class="sp-v2-option__icon">1</div>
                    <div class="sp-v2-option__label">VG1</div>
                    <div class="sp-v2-option__description">Skal velge fag for VG2</div>
                  </div>
                  <div class="sp-v2-option sp-v2-option--card" data-value="vg2" tabindex="0">
                    <div class="sp-v2-option__icon">2</div>
                    <div class="sp-v2-option__label">VG2</div>
                    <div class="sp-v2-option__description">Skal velge fag for VG3</div>
                  </div>
                </div>
              </div>

              <!-- Slide 2: Programområde -->
              <div class="sp-v2-wizard__slide" data-question="programomrade">
                <div class="sp-v2-question__label">Hvilket programområde?</div>
                <div class="sp-v2-options">
                  <div class="sp-v2-option" data-value="studiespesialisering" tabindex="0">
                    <div class="sp-v2-option__radio"></div>
                    <div class="sp-v2-option__content">
                      <div class="sp-v2-option__label">Studiespesialisering</div>
                      <div class="sp-v2-option__description">Realfag eller språk, samfunnsfag og økonomi</div>
                    </div>
                  </div>
                  <div class="sp-v2-option" data-value="musikk-dans-drama" tabindex="0">
                    <div class="sp-v2-option__radio"></div>
                    <div class="sp-v2-option__content">
                      <div class="sp-v2-option__label">Musikk, dans og drama</div>
                    </div>
                  </div>
                  <div class="sp-v2-option" data-value="medier-kommunikasjon" tabindex="0">
                    <div class="sp-v2-option__radio"></div>
                    <div class="sp-v2-option__content">
                      <div class="sp-v2-option__label">Medier og kommunikasjon</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Slide 3: Fremmedspråk -->
              <div class="sp-v2-wizard__slide" data-question="harFremmedsprak">
                <div class="sp-v2-question__label">Hadde du fremmedspråk på ungdomsskolen?</div>
                <div class="sp-v2-options sp-v2-options--horizontal">
                  <div class="sp-v2-option sp-v2-option--card" data-value="true" tabindex="0">
                    <div class="sp-v2-option__icon">✓</div>
                    <div class="sp-v2-option__label">Ja</div>
                    <div class="sp-v2-option__description">Spansk, tysk, fransk e.l.</div>
                  </div>
                  <div class="sp-v2-option sp-v2-option--card" data-value="false" tabindex="0">
                    <div class="sp-v2-option__icon">✗</div>
                    <div class="sp-v2-option__label">Nei</div>
                    <div class="sp-v2-option__description">Arbeidslivsfag e.l.</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div class="sp-v2-wizard__nav">
            <button class="sp-v2-btn sp-v2-btn--secondary sp-v2-onboarding-back" style="opacity: 0; pointer-events: none;">
              ← Tilbake
            </button>
            <div class="sp-v2-wizard__dots">
              <span class="sp-v2-wizard__dot sp-v2-wizard__dot--active"></span>
              <span class="sp-v2-wizard__dot"></span>
              <span class="sp-v2-wizard__dot"></span>
            </div>
            <div style="width: 100px;"></div>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Option clicks - auto-advance on selection
    this.container.querySelectorAll('.sp-v2-option').forEach(option => {
      option.addEventListener('click', (e) => this.handleOptionClick(e));
      option.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleOptionClick(e);
        }
      });
    });

    // Back button
    this.container.querySelector('.sp-v2-onboarding-back').addEventListener('click', () => {
      this.goBack();
    });
  }

  handleOptionClick(e) {
    const option = e.currentTarget;
    const slide = option.closest('.sp-v2-wizard__slide');
    const questionKey = slide.dataset.question;
    let value = option.dataset.value;

    // Parse boolean
    if (value === 'true') value = true;
    if (value === 'false') value = false;

    this.selections[questionKey] = value;

    // Visual feedback
    slide.querySelectorAll('.sp-v2-option').forEach(opt => {
      opt.classList.remove('sp-v2-option--selected');
    });
    option.classList.add('sp-v2-option--selected');

    // Auto-advance after short delay
    setTimeout(() => {
      if (this.currentStep < this.questions.length - 1) {
        this.goNext();
      } else {
        this.complete();
      }
    }, 300);
  }

  goNext() {
    if (this.currentStep >= this.questions.length - 1) return;

    this.currentStep++;
    this.updateSlider();
  }

  goBack() {
    if (this.currentStep <= 0) return;

    // Clear current selection
    const currentQuestion = this.questions[this.currentStep];
    this.selections[currentQuestion] = null;

    this.currentStep--;
    this.updateSlider();
  }

  updateSlider() {
    // Slide animation
    const slides = this.container.querySelector('.sp-v2-wizard__slides');
    slides.style.transform = `translateX(-${this.currentStep * 100}%)`;

    // Progress bar
    const progress = ((this.currentStep + 1) / this.questions.length) * 100;
    const progressFill = this.container.querySelector('.sp-v2-wizard__progress-fill');
    progressFill.style.width = `${progress}%`;

    // Step label
    const stepLabel = this.container.querySelector('.sp-v2-wizard__step-label');
    stepLabel.textContent = `Steg ${this.currentStep + 1} av ${this.questions.length}`;

    // Back button visibility
    const backBtn = this.container.querySelector('.sp-v2-onboarding-back');
    backBtn.style.opacity = this.currentStep > 0 ? '1' : '0';
    backBtn.style.pointerEvents = this.currentStep > 0 ? 'auto' : 'none';

    // Update dots
    this.container.querySelectorAll('.sp-v2-wizard__dot').forEach((dot, i) => {
      dot.classList.remove('sp-v2-wizard__dot--active', 'sp-v2-wizard__dot--completed');
      if (i < this.currentStep) dot.classList.add('sp-v2-wizard__dot--completed');
      if (i === this.currentStep) dot.classList.add('sp-v2-wizard__dot--active');
    });
  }

  complete() {
    this.container.classList.remove('sp-v2-onboarding-overlay--visible');
    setTimeout(() => {
      this.container.remove();
      this.onComplete(this.selections);
    }, 300);
  }

  hide() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
