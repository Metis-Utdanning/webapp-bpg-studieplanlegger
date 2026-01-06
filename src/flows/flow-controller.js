/**
 * Flow Controller - Manages user journey through the subject planner
 *
 * Two distinct flows based on current grade:
 *
 * VG1 Student (choosing subjects for VG2):
 *   Step 1: Select VG1 subjects (matematikk + fremmedspråk)
 *   Step 2: Select VG2 subjects (blokkskjema)
 *   Step 3: View/select VG3 projection (tentative)
 *
 * VG2 Student (choosing subjects for VG3):
 *   Step 1: Enter VG1 subjects retrospectively
 *   Step 2: Enter VG2 subjects retrospectively
 *   Step 3: Select VG3 subjects (blokkskjema)
 */

export class FlowController {
  constructor(options = {}) {
    this.state = options.state;
    this.dataHandler = options.dataHandler;
    this.validator = options.validator;
    this.onStepChange = options.onStepChange || (() => {});
    this.onFlowComplete = options.onFlowComplete || (() => {});

    // Flow state
    this.flowState = {
      currentStudentGrade: null,  // 'vg1' or 'vg2' - which grade the student is in NOW
      currentStep: 0,
      totalSteps: 3,
      steps: [],
      isComplete: false
    };
  }

  /**
   * Initialize flow based on student's current grade
   * @param {string} studentGrade - 'vg1' or 'vg2'
   */
  initializeFlow(studentGrade) {
    this.flowState.currentStudentGrade = studentGrade;
    this.flowState.currentStep = 0;
    this.flowState.isComplete = false;

    if (studentGrade === 'vg1') {
      // VG1 student: choosing for next year
      this.flowState.steps = [
        {
          id: 'vg1-selection',
          title: 'VG1 - Dine fag',
          subtitle: 'Velg matematikk og fremmedspråk',
          trinn: 'vg1',
          type: 'selection',
          isActive: true,
          isComplete: false,
          isProjection: false
        },
        {
          id: 'vg2-selection',
          title: 'VG2 - Fagvalg',
          subtitle: 'Velg programfag for neste år',
          trinn: 'vg2',
          type: 'blokkskjema',
          isActive: false,
          isComplete: false,
          isProjection: false
        },
        {
          id: 'vg3-projection',
          title: 'VG3 - Projeksjon',
          subtitle: 'Se og velg mulige fag',
          trinn: 'vg3',
          type: 'blokkskjema',
          isActive: false,
          isComplete: false,
          isProjection: true  // Marked as tentative
        }
      ];
    } else {
      // VG2 student: need to enter past + current, then choose VG3
      this.flowState.steps = [
        {
          id: 'vg1-retrospective',
          title: 'VG1 - Tilbakeblikk',
          subtitle: 'Hvilke fag hadde du?',
          trinn: 'vg1',
          type: 'retrospective',
          isActive: true,
          isComplete: false,
          isProjection: false,
          softValidation: true  // Myk validering - advarsler men tillatt
        },
        {
          id: 'vg2-retrospective',
          title: 'VG2 - I år',
          subtitle: 'Hvilke fag har du?',
          trinn: 'vg2',
          type: 'retrospective',
          isActive: false,
          isComplete: false,
          isProjection: false,
          softValidation: true
        },
        {
          id: 'vg3-selection',
          title: 'VG3 - Fagvalg',
          subtitle: 'Velg programfag for neste år',
          trinn: 'vg3',
          type: 'blokkskjema',
          isActive: false,
          isComplete: false,
          isProjection: false
        }
      ];
    }

    this.flowState.totalSteps = this.flowState.steps.length;
    this.onStepChange(this.getFlowState());
  }

  /**
   * Get current flow state
   */
  getFlowState() {
    return {
      ...this.flowState,
      currentStepData: this.flowState.steps[this.flowState.currentStep] || null,
      canGoBack: this.flowState.currentStep > 0,
      canGoForward: this.canProceedToNextStep()
    };
  }

  /**
   * Check if current step is complete enough to proceed
   */
  canProceedToNextStep() {
    const currentStep = this.flowState.steps[this.flowState.currentStep];
    if (!currentStep) return false;

    const state = this.state.getState();
    const trinn = currentStep.trinn;
    const selections = state[trinn]?.selections || [];

    // For soft validation (retrospective), always allow proceeding with warnings
    if (currentStep.softValidation) {
      return true;
    }

    // Check based on trinn requirements
    if (trinn === 'vg1') {
      const hasMath = selections.some(s => s.slot === 'matematikk');
      const hasLanguage = selections.some(s => s.slot === 'fremmedsprak');
      return hasMath && hasLanguage;
    }

    if (trinn === 'vg2') {
      // Need matematikk + 3 programfag = 4 total
      return selections.length >= 4;
    }

    if (trinn === 'vg3') {
      // Need historie + 3 programfag = 4 total (or projection allows any)
      if (currentStep.isProjection) {
        return true; // Projection can always proceed
      }
      return selections.length >= 4;
    }

    return false;
  }

  /**
   * Get validation status for current step
   */
  getStepValidation() {
    const currentStep = this.flowState.steps[this.flowState.currentStep];
    if (!currentStep) return { isValid: false, warnings: [], errors: [] };

    const state = this.state.getState();
    const trinn = currentStep.trinn;
    const selections = state[trinn]?.selections || [];

    const result = {
      isValid: this.canProceedToNextStep(),
      warnings: [],
      errors: [],
      progress: { current: 0, required: 0 }
    };

    if (trinn === 'vg1') {
      result.progress.required = 2;
      const hasMath = selections.some(s => s.slot === 'matematikk');
      const hasLanguage = selections.some(s => s.slot === 'fremmedsprak');
      result.progress.current = (hasMath ? 1 : 0) + (hasLanguage ? 1 : 0);

      if (!hasMath) result.errors.push('Velg matematikk (1P eller 1T)');
      if (!hasLanguage) result.errors.push('Velg fremmedspråk');
    }

    if (trinn === 'vg2') {
      result.progress.required = 4;
      result.progress.current = selections.length;

      const hasMath = selections.some(s => s.slot === 'matematikk');
      const programfagCount = selections.filter(s => s.slot?.startsWith('programfag-')).length;

      if (!hasMath && !currentStep.softValidation) {
        result.errors.push('Velg matematikk');
      }
      if (programfagCount < 3 && !currentStep.softValidation) {
        result.errors.push(`Velg ${3 - programfagCount} programfag til`);
      }

      // Soft validation warnings
      if (currentStep.softValidation) {
        if (!hasMath) result.warnings.push('Matematikk ikke angitt');
        if (programfagCount < 3) result.warnings.push(`${programfagCount}/3 programfag angitt`);
      }
    }

    if (trinn === 'vg3') {
      result.progress.required = 4;
      result.progress.current = selections.length;

      const hasHistorie = selections.some(s => s.slot === 'historie');
      const programfagCount = selections.filter(s => s.slot?.startsWith('programfag-')).length;

      if (!hasHistorie && !currentStep.isProjection) {
        result.errors.push('Historie er obligatorisk');
      }
      if (programfagCount < 3 && !currentStep.isProjection) {
        result.errors.push(`Velg ${3 - programfagCount} programfag til`);
      }

      if (currentStep.isProjection) {
        result.warnings.push('Dette er en projeksjon - du velger offisielt senere');
      }
    }

    return result;
  }

  /**
   * Go to next step
   */
  nextStep() {
    if (!this.canProceedToNextStep()) {
      console.warn('Cannot proceed - current step not complete');
      return false;
    }

    // Mark current step as complete
    this.flowState.steps[this.flowState.currentStep].isComplete = true;
    this.flowState.steps[this.flowState.currentStep].isActive = false;

    // Check if this was the last step
    if (this.flowState.currentStep >= this.flowState.totalSteps - 1) {
      this.flowState.isComplete = true;
      this.onFlowComplete(this.getFlowState());
      return true;
    }

    // Move to next step
    this.flowState.currentStep++;
    this.flowState.steps[this.flowState.currentStep].isActive = true;

    this.onStepChange(this.getFlowState());
    return true;
  }

  /**
   * Go to previous step
   */
  previousStep() {
    if (this.flowState.currentStep <= 0) {
      return false;
    }

    // Deactivate current step
    this.flowState.steps[this.flowState.currentStep].isActive = false;

    // Move back
    this.flowState.currentStep--;
    this.flowState.steps[this.flowState.currentStep].isActive = true;
    this.flowState.steps[this.flowState.currentStep].isComplete = false;

    this.onStepChange(this.getFlowState());
    return true;
  }

  /**
   * Jump to a specific step (only if previous steps are complete)
   */
  goToStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.flowState.totalSteps) {
      return false;
    }

    // Check if all previous steps are complete
    for (let i = 0; i < stepIndex; i++) {
      if (!this.flowState.steps[i].isComplete) {
        console.warn(`Cannot jump to step ${stepIndex} - step ${i} not complete`);
        return false;
      }
    }

    // Deactivate current step
    this.flowState.steps[this.flowState.currentStep].isActive = false;

    // Activate target step
    this.flowState.currentStep = stepIndex;
    this.flowState.steps[stepIndex].isActive = true;

    this.onStepChange(this.getFlowState());
    return true;
  }

  /**
   * Reset flow to beginning
   */
  reset() {
    this.flowState.currentStep = 0;
    this.flowState.isComplete = false;

    this.flowState.steps.forEach((step, index) => {
      step.isActive = index === 0;
      step.isComplete = false;
    });

    this.state.clearAllSelections();
    this.onStepChange(this.getFlowState());
  }

  /**
   * Get column state for 3-column view
   * Returns which columns should be active, editable, or projection
   */
  getColumnStates() {
    const state = this.getFlowState();
    const currentStep = state.currentStepData;

    return {
      vg1: {
        isActive: currentStep?.trinn === 'vg1',
        isEditable: currentStep?.trinn === 'vg1',
        isComplete: this.flowState.steps.find(s => s.trinn === 'vg1')?.isComplete || false,
        isProjection: false,
        label: this.flowState.currentStudentGrade === 'vg2' ? 'Tilbakeblikk' : 'I dag'
      },
      vg2: {
        isActive: currentStep?.trinn === 'vg2',
        isEditable: currentStep?.trinn === 'vg2',
        isComplete: this.flowState.steps.find(s => s.trinn === 'vg2')?.isComplete || false,
        isProjection: false,
        label: this.flowState.currentStudentGrade === 'vg1' ? 'Neste år' : 'I dag'
      },
      vg3: {
        isActive: currentStep?.trinn === 'vg3',
        isEditable: currentStep?.trinn === 'vg3',
        isComplete: this.flowState.steps.find(s => s.trinn === 'vg3')?.isComplete || false,
        isProjection: this.flowState.currentStudentGrade === 'vg1',
        label: this.flowState.currentStudentGrade === 'vg1' ? 'Projeksjon' : 'Neste år'
      }
    };
  }

  /**
   * Check if a specific trinn's column should be interactive
   */
  isTrinnEditable(trinn) {
    const columnStates = this.getColumnStates();
    return columnStates[trinn]?.isEditable || false;
  }

  /**
   * Get info text for projection column
   */
  getProjectionInfo() {
    if (this.flowState.currentStudentGrade !== 'vg1') {
      return null;
    }

    return {
      title: 'VG3 Projeksjon',
      description: 'Basert på dine VG2-valg kan du allerede nå utforske mulige fag for VG3. ' +
                   'Dette er tentativt - du gjør det offisielle valget neste år.',
      note: 'Fagene du velger her blir lagret, men de kan endres når du faktisk skal velge.'
    };
  }
}
