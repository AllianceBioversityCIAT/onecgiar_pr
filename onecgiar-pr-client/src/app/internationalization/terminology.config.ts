// terminology.config.ts
export type TermKey =
  | 'term.entity.singular'
  | 'term.entity.plural'
  | 'term.entity.orPlatforms'
  | 'term.entity.orPlatformsPlural'
  | 'term.entity.orPlatformsWith()'
  | 'term.entity.singularWith()'
  | 'term.entity.orPlatformsOrSGP';

export const LEGACY_TERMS: Record<TermKey, string> = {
  'term.entity.singular': 'Initiative',
  'term.entity.singularWith()': 'Initiative(s)',
  'term.entity.plural': 'Initiatives',
  'term.entity.orPlatforms': 'Initiative or platform',
  'term.entity.orPlatformsPlural': 'Initiatives or platforms',
  'term.entity.orPlatformsWith()': 'Initiative(s) or platform(s)',
  'term.entity.orPlatformsOrSGP': 'Initiative, Platform or SGP'
};

export const NEW_TERMS: Record<TermKey, string> = {
  'term.entity.singular': 'Science Program/Accelerator',
  'term.entity.singularWith()': 'Science Program/Accelerator',
  'term.entity.plural': 'Science Program/Accelerator',
  'term.entity.orPlatforms': 'Science Program/Accelerator',
  'term.entity.orPlatformsPlural': 'Science Program/Accelerator',
  'term.entity.orPlatformsWith()': 'Science Program/Accelerator',
  'term.entity.orPlatformsOrSGP': 'Science Program/Accelerator'
};
