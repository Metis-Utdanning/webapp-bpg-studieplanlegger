/**
 * Studieplanlegger V2 - With Flow-based User Journey
 *
 * This version adds:
 * - Trinn-based user flows (VG1 student vs VG2 student)
 * - Progressive onboarding
 * - Step-by-step navigation
 * - VG3 projection for VG1 students
 * - Retrospective input for VG2 students
 *
 * Extends the base Studieplanlegger functionality.
 */

import { Studieplanlegger } from './studieplanlegger.js';
import { FlowController } from './flows/flow-controller.js';
import { FlowStepper, FlowNavigation, FlowOnboarding } from './ui/components/flow-stepper.js';
import { StepRenderer } from './ui/components/flow-steps.js';

export class StudieplanleggerV2 extends Studieplanlegger {
  constructor(container, options = {}) {
    // Add v2-specific defaults
    const v2Options = {
      ...options,
      defaultBlokkskjemaVersion: options.defaultBlokkskjemaVersion || '26-27_flex',
      useV2Flow: true
    };

    super(container, v2Options);

    // V2-specific properties
    this.flowController = null;
    this.flowStepper = null;
    this.flowNavigation = null;
    this.stepRenderer = null;
    this.v2Initialized = false;
    this.flowPhase = 'onboarding'; // 'onboarding' | 'steps' | 'complete'
  }

  /**
   * Override init to add v2 flow
   */
  async init() {
    try {
      // Call parent init first
      await this.parentInit();

      // Initialize v2 flow components
      this.initV2Flow();

      console.log('Studieplanlegger V2 initialized');
    } catch (error) {
      console.error('Failed to initialize Studieplanlegger V2:', error);
      throw error;
    }
  }

  /**
   * Parent init logic (copied to avoid super.init() issues)
   */
  async parentInit() {
    // Set programområde on body for CSS
    document.body.setAttribute('data-programomrade', this.state.getState().programomrade);

    // Load data from API
    await this.dataHandler.loadAll();

    // Initialize blokkskjema version
    this.initBlokkskjemaVersion();

    // Initialize validator with rules
    if (this.dataHandler.data.regler) {
      await this.validator.init(this.dataHandler.data.regler);
    } else {
      console.warn('⚠️ No regler found in data, validator will use fallback');
      await this.validator.init(null);
    }

    // Check for admin mode
    const urlParams = new URLSearchParams(window.location.search);
    this.isAdminMode = urlParams.get('admin') === 'true';

    // Render initial UI (without old onboarding)
    this.renderer.render();

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Override blokkskjema version init to use v2 default
   */
  initBlokkskjemaVersion() {
    const versions = this.dataHandler.getAvailableVersions();
    if (!versions || versions.length === 0) {
      console.warn('⚠️ No blokkskjema versions available');
      return;
    }

    // Use v2 default or first available
    const defaultVersion = this.options.defaultBlokkskjemaVersion;
    if (versions.includes(defaultVersion)) {
      this.currentBlokkskjemaVersion = defaultVersion;
    } else {
      this.currentBlokkskjemaVersion = versions[0];
    }

    // Also set in dataHandler if it has a setter
    if (this.dataHandler.setActiveVersion) {
      this.dataHandler.setActiveVersion(this.currentBlokkskjemaVersion);
    }

    console.log(`📋 Using blokkskjema version: ${this.currentBlokkskjemaVersion}`);
  }

  /**
   * Initialize V2 flow components
   */
  initV2Flow() {
    // Create flow controller
    this.flowController = new FlowController({
      state: this.state,
      dataHandler: this.dataHandler,
      validator: this.validator,
      onStepChange: (flowState) => this.handleStepChange(flowState),
      onFlowComplete: (flowState) => this.handleFlowComplete(flowState)
    });

    // Check if we need onboarding
    this.checkAndShowV2Onboarding();
  }

  /**
   * Check and show V2 onboarding
   */
  checkAndShowV2Onboarding() {
    const onboardingCompleted = localStorage.getItem('studieplanlegger_v2_onboarding_completed');

    if (!onboardingCompleted) {
      this.showV2Onboarding();
    } else {
      // Load saved preferences and start flow
      const savedPrefs = JSON.parse(localStorage.getItem('studieplanlegger_v2_prefs') || '{}');
      if (savedPrefs.studentGrade) {
        this.startFlowWithPrefs(savedPrefs);
      } else {
        this.showV2Onboarding();
      }
    }
  }

  /**
   * Show V2 onboarding modal
   */
  showV2Onboarding() {
    const onboarding = new FlowOnboarding({
      onComplete: (selections) => this.completeV2Onboarding(selections)
    });

    onboarding.show(this.container);
  }

  /**
   * Complete V2 onboarding and start the flow
   */
  completeV2Onboarding(selections) {
    console.log('V2 Onboarding completed:', selections);

    // Save preferences
    localStorage.setItem('studieplanlegger_v2_onboarding_completed', 'true');
    localStorage.setItem('studieplanlegger_v2_prefs', JSON.stringify(selections));

    // Apply selections to state
    this.state.setProgramomrade(selections.programomrade);
    this.state.setHarFremmedsprak(selections.harFremmedsprak);

    // Start the appropriate flow
    this.startFlowWithPrefs(selections);
  }

  /**
   * Start flow based on saved preferences
   */
  startFlowWithPrefs(prefs) {
    // Initialize flow based on student's current grade
    this.flowController.initializeFlow(prefs.studentGrade);

    // Start the step-based flow (Del 2)
    this.flowPhase = 'steps';
    this.renderStepFlow();
  }

  /**
   * Render the step-based flow (Del 2)
   * Shows fullscreen step UI for subject selection
   */
  renderStepFlow() {
    // Clear the container
    this.container.innerHTML = '';

    // Create step container
    const stepContainer = document.createElement('div');
    stepContainer.className = 'sp-v2-step-container';
    this.container.appendChild(stepContainer);

    // Initialize step renderer
    this.stepRenderer = new StepRenderer(stepContainer, {
      state: this.state,
      dataHandler: this.dataHandler,
      flowController: this.flowController,
      onFlowComplete: () => this.handleAllStepsComplete(),
      onReset: () => this.reset()
    });

    // Render the first step
    this.stepRenderer.render();

    this.v2Initialized = true;
  }

  /**
   * Handle all steps complete - transition to 3-column view (Del 3)
   */
  handleAllStepsComplete() {
    console.log('All steps complete - transitioning to summary view');
    this.flowPhase = 'complete';

    // Render the 3-column summary view
    this.renderWithFlow();
  }

  /**
   * Render the UI with flow components
   */
  renderWithFlow() {
    const flowState = this.flowController.getFlowState();
    const columnStates = this.flowController.getColumnStates();

    // Get the main container
    const mainContent = this.container.querySelector('.sp-container') || this.container;

    // Add stepper container if not exists
    let stepperContainer = mainContent.querySelector('.sp-v2-stepper-container');
    if (!stepperContainer) {
      stepperContainer = document.createElement('div');
      stepperContainer.className = 'sp-v2-stepper-container';
      mainContent.insertBefore(stepperContainer, mainContent.firstChild);
    }

    // Render stepper
    this.flowStepper = new FlowStepper(stepperContainer, this.flowController);
    this.flowStepper.render();

    // Update column states
    this.updateColumnStates(columnStates);

    // Add navigation container if not exists
    let navContainer = mainContent.querySelector('.sp-v2-nav-container');
    if (!navContainer) {
      navContainer = document.createElement('div');
      navContainer.className = 'sp-v2-nav-container';
      mainContent.appendChild(navContainer);
    }

    // Render navigation
    this.flowNavigation = new FlowNavigation(navContainer, this.flowController, {
      onNext: () => this.handleNavigationChange(),
      onPrevious: () => this.handleNavigationChange()
    });
    this.flowNavigation.render();

    // Show projection banner if applicable
    this.updateProjectionBanner();

    this.v2Initialized = true;
  }

  /**
   * Update column visual states based on flow
   */
  updateColumnStates(columnStates) {
    ['vg1', 'vg2', 'vg3'].forEach(trinn => {
      const columnState = columnStates[trinn];
      const columnEl = this.container.querySelector(`[data-trinn="${trinn}"], .sp-trinn-${trinn}`);

      if (!columnEl) return;

      // Remove all state classes
      columnEl.classList.remove(
        'sp-trinn-kolonne--active',
        'sp-trinn-kolonne--complete',
        'sp-trinn-kolonne--disabled',
        'sp-trinn-kolonne--projection'
      );

      // Add appropriate classes
      if (columnState.isActive) {
        columnEl.classList.add('sp-trinn-kolonne--active');
      }
      if (columnState.isComplete) {
        columnEl.classList.add('sp-trinn-kolonne--complete');
      }
      if (columnState.isProjection) {
        columnEl.classList.add('sp-trinn-kolonne--projection');
      }
      if (!columnState.isEditable && !columnState.isComplete) {
        columnEl.classList.add('sp-trinn-kolonne--disabled');
      }

      // Add/update label
      let labelEl = columnEl.querySelector('.sp-trinn-kolonne__label');
      if (!labelEl) {
        labelEl = document.createElement('span');
        labelEl.className = 'sp-trinn-kolonne__label';
        const header = columnEl.querySelector('.sp-trinn-header');
        if (header) {
          header.appendChild(labelEl);
        }
      }
      labelEl.textContent = columnState.label;
    });
  }

  /**
   * Update projection banner visibility
   */
  updateProjectionBanner() {
    const projectionInfo = this.flowController.getProjectionInfo();
    const currentStep = this.flowController.getFlowState().currentStepData;

    // Remove existing banner
    const existingBanner = this.container.querySelector('.sp-v2-projection-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    // Add banner if we're on projection step
    if (projectionInfo && currentStep?.isProjection) {
      const banner = document.createElement('div');
      banner.className = 'sp-v2-projection-banner';
      banner.innerHTML = `
        <div class="sp-v2-projection-banner__title">
          <span>🔮</span> ${projectionInfo.title}
        </div>
        <div class="sp-v2-projection-banner__description">
          ${projectionInfo.description}
        </div>
        <div class="sp-v2-projection-banner__note">
          ${projectionInfo.note}
        </div>
      `;

      const grid = this.container.querySelector('.sp-trinn-grid');
      if (grid) {
        grid.parentNode.insertBefore(banner, grid);
      }
    }
  }

  /**
   * Handle step change from flow controller
   */
  handleStepChange(flowState) {
    console.log('Flow step changed:', flowState);

    if (this.v2Initialized) {
      // Update stepper
      if (this.flowStepper) {
        this.flowStepper.update();
      }

      // Update column states
      const columnStates = this.flowController.getColumnStates();
      this.updateColumnStates(columnStates);

      // Update navigation
      if (this.flowNavigation) {
        this.flowNavigation.update();
      }

      // Update projection banner
      this.updateProjectionBanner();

      // Show retrospective notice if needed
      this.updateRetrospectiveNotice(flowState.currentStepData);
    }
  }

  /**
   * Update retrospective input notice
   */
  updateRetrospectiveNotice(currentStep) {
    // Remove existing notice
    const existingNotice = this.container.querySelector('.sp-v2-retrospective-notice');
    if (existingNotice) {
      existingNotice.remove();
    }

    // Add notice if current step is retrospective
    if (currentStep?.type === 'retrospective') {
      const notice = document.createElement('div');
      notice.className = 'sp-v2-retrospective-notice';
      notice.innerHTML = `
        <div class="sp-v2-retrospective-notice__icon">📝</div>
        <div class="sp-v2-retrospective-notice__content">
          <div class="sp-v2-retrospective-notice__title">Angi dine fag</div>
          <div class="sp-v2-retrospective-notice__text">
            Velg fagene du ${currentStep.trinn === 'vg1' ? 'hadde' : 'har'} i ${currentStep.trinn.toUpperCase()}.
            Dette hjelper oss å vise deg riktige valg for VG3.
          </div>
        </div>
      `;

      const grid = this.container.querySelector('.sp-trinn-grid');
      if (grid) {
        grid.parentNode.insertBefore(notice, grid);
      }
    }
  }

  /**
   * Handle flow completion
   */
  handleFlowComplete(flowState) {
    console.log('Flow completed:', flowState);

    // Show completion message or summary
    this.showCompletionSummary();
  }

  /**
   * Show completion summary
   */
  showCompletionSummary() {
    const state = this.state.getState();
    const validation = this.state.validate();

    // Create summary modal or section
    console.log('Plan complete!', { state, validation });

    // TODO: Add visual completion UI
  }

  /**
   * Handle navigation changes
   */
  handleNavigationChange() {
    // Update all flow-related UI
    this.handleStepChange(this.flowController.getFlowState());
  }

  /**
   * Override reset to also reset flow
   */
  reset() {
    // Reset flow controller
    if (this.flowController) {
      this.flowController.reset();
    }

    // Clear ALL studieplanlegger storage
    localStorage.removeItem('studieplanlegger_v2_onboarding_completed');
    localStorage.removeItem('studieplanlegger_v2_prefs');
    localStorage.removeItem('studieplanlegger_onboarding_completed');

    // Clear state
    this.state.clearAllSelections();

    // Remove any existing flow UI
    const stepperContainer = this.container.querySelector('.sp-v2-stepper-container');
    if (stepperContainer) stepperContainer.remove();
    const navContainer = this.container.querySelector('.sp-v2-nav-container');
    if (navContainer) navContainer.remove();
    const banner = this.container.querySelector('.sp-v2-projection-banner');
    if (banner) banner.remove();
    const notice = this.container.querySelector('.sp-v2-retrospective-notice');
    if (notice) notice.remove();

    // Reset v2 state
    this.v2Initialized = false;
    this.flowController = null;
    this.stepRenderer = null;
    this.flowPhase = 'onboarding';

    // Re-initialize flow controller
    this.initV2Flow();
  }

  /**
   * Check if a trinn is currently editable
   */
  isTrinnEditable(trinn) {
    if (!this.flowController) return true; // Fallback to editable

    return this.flowController.isTrinnEditable(trinn);
  }

  /**
   * Override openBlokkskjemaModal to check editability
   */
  openBlokkskjemaModal(trinn) {
    // Check if this trinn is editable in current flow step
    if (!this.isTrinnEditable(trinn)) {
      const columnStates = this.flowController.getColumnStates();
      const columnState = columnStates[trinn];

      if (columnState.isComplete) {
        // Allow editing completed steps
        console.log(`Re-editing ${trinn} (completed step)`);
      } else {
        console.log(`Cannot edit ${trinn} - not active step`);
        return;
      }
    }

    // Call parent method
    super.openBlokkskjemaModal(trinn);
  }
}

// Export for use in demo-redesign.html
export { StudieplanleggerV2 as Studieplanlegger };
