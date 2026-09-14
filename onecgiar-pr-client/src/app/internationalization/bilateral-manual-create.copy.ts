// @akili-spec bilateral/manual-create-drawer (BIL-MCD-T-7)
/**
 * W3 bilateral manual-create drawer — centralized user-facing copy (NFR i18n).
 * A later multilingual pass edits this file instead of hunting templates.
 */

export const BILATERAL_MANUAL_CREATE_COPY = {
  drawer: {
    title: 'Set up bilateral result',
    ariaLabel: 'Set up bilateral result manually',
    closeAriaLabel: 'Close',
    resizeAriaLabel: 'Resize panel',
    primaryScienceProgramLabel: 'Primary Science Program',
    programIconAlt: (code: string): string => `${code} icon`
  },
  navigation: {
    backToCreateOptions: 'Back to create options',
    backToScienceProgram: 'Back to Science Program'
  },
  spGate: {
    hint: 'Select the primary Science Program for this bilateral result before continuing.',
    reportingLockedHint: 'Select a primary Science Program above to unlock these options.'
  },
  form: {
    resultTypeLabel: 'Result Type',
    selectResultType: 'Select result type',
    resultTitleLabel: 'Result title',
    titlePlaceholder: 'Brief, descriptive title for this result…',
    wordGauge: (count: number): string => `${count}/30 words`,
    kpTabsAriaLabel: 'How to add the knowledge product',
    browseRepositories: 'Browse repositories',
    manualEntry: 'Manual entry',
    selectedFromRepository: (label: string): string => `Selected from ${label}`,
    changeItem: 'Change item',
    repositoryHandleLabel: 'Repository link/handle',
    repositoryHandlePlaceholder: 'Paste the repository link…',
    syncing: 'Syncing…',
    sync: 'Sync',
    validatingTitle: 'Validating title, please wait…',
    titleCheckFailed:
      'Unable to verify title uniqueness. Please try again before creating this result.',
    duplicateTitle: 'A result with this exact title already exists. Please use a different title.',
    titleAvailable: 'No existing result found with this exact title. You can proceed to create this result.',
    similarTitlesHeading: 'Similar reported titles',
    fieldsLeftSingular: '1 field left before you can create',
    fieldsLeftPlural: (count: number): string => `${count} fields left before you can create`,
    readyToCreate: 'Ready to create',
    creating: 'Creating…',
    createAndContinue: 'Create and continue'
  },
  missingFieldLabels: {
    resultLevel: 'Result level',
    resultType: 'Result type',
    repositoryHandle: 'Repository link/handle',
    resultTitle: 'Result title',
    titleTooLong: 'Result title exceeds 30 words',
    titleCheckFailed: 'Title check failed — retry',
    titleExists: 'Result title already exists'
  }
} as const;
