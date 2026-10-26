/**
 * Phase management page redesign — user-facing copy (client CLAUDE.md §5/§10).
 * Spec `changes/phase-management-redesign` (PMR-DD-7). Existing component strings
 * (replicate banners, descriptions, alerts, tooltips) are intentionally not moved here.
 */
export const PHASE_MANAGEMENT_COPY = {
  breadcrumbAdmin: 'Admin module',
  breadcrumbPhaseManagement: 'Phase management',
  tabsNavLabel: 'Phase management modules',
  reportingTitle: 'Reporting phases',
  reportingDescription: 'Create, open and close the reporting phases of the Results module.',
  ipsrTitle: 'IPSR phases',
  ipsrDescription: 'Create, open and close the phases of the Innovation Packages and Scaling Readiness module.',
  configuredPhases: 'Configured phases',
  totalChip: (n: number): string => `${n} total`,
  openChip: (n: number): string => `${n} open`,
  phaseOperations: 'Phase operations',
  targetPhase: 'Target phase',
  resultInnovationsTitle: 'Result innovations',
  innovationUseTitle: 'Innovation use',
  innovationPackagesTitle: 'Innovation packages',
  deletePhaseLabel: 'Delete phase',
  createPhaseLabel: 'Create phase',
  savePhaseLabel: 'Save phase',
  cancelEditLabel: 'Cancel editing'
} as const;
