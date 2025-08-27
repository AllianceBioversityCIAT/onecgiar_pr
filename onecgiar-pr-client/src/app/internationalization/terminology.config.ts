// terminology.config.ts
export type TermKey =
  | 'term.entity.singular'
  | 'term.entity.plural'
  | 'term.entity.orPlatforms'
  | 'term.entity.orPlatformsPlural'
  | 'term.entity.orPlatformsWith()'
  | 'term.entity.singularWith()';

export const LEGACY_TERMS: Record<TermKey, string> = {
  'term.entity.singular': 'Initiative',
  'term.entity.singularWith()': 'Initiative(s)',
  'term.entity.plural': 'Initiatives',
  'term.entity.orPlatforms': 'Initiative or platform',
  'term.entity.orPlatformsPlural': 'Initiatives or platforms',
  'term.entity.orPlatformsWith()': 'Initiative(s) or platform(s)'
};

export const NEW_TERMS: Record<TermKey, string> = {
  'term.entity.singular': 'Science Program or Accelerator',
  'term.entity.singularWith()': 'Science Program or Accelerator',
  'term.entity.plural': 'Science Program or Accelerator',
  'term.entity.orPlatforms': 'Science Program or Accelerator',
  'term.entity.orPlatformsPlural': 'Science Program or Accelerator',
  'term.entity.orPlatformsWith()': 'Science Program or Accelerator'
};
