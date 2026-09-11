// @akili-spec changes/kp-multi-repository-browse — KPM-DD-9
/**
 * Repository display metadata shared by the Browse panel and the three KP hosts.
 *
 * Single source of truth for labels, badge/dot classes and item hosts so the strip,
 * the card badges, the "Selected from …" banners and the notices never drift
 * (`design.md` §6.2 / `KPM-DD-9`). Tailwind-first, tokens from `design.md` §7.
 */

/** The three CGIAR knowledge repositories the Browse tab can search. */
export type KpRepository = 'cgspace' | 'melspace' | 'worldfish';

/** Per-source status reported by the server in `sources[]` (`design.md` §4.1). */
export type KpRepositoryStatus = 'ok' | 'timeout' | 'error' | 'unconfigured';

export interface KpRepositoryMeta {
  /** Enum value sent to the server in the `repository` param. */
  key: KpRepository;
  /** User-facing name — the only string rendered for this repository. */
  label: string;
  /** Tailwind classes for the 7 px badge dot (never color alone, `design.md` §10). */
  dotClass: string;
  /** Tailwind classes for the card badge shell (background + border + text). */
  badgeClass: string;
  /** Host of this repository's `/items/<uuid>` records. */
  host: string;
}

export const KP_REPOSITORIES: Record<KpRepository, KpRepositoryMeta> = {
  cgspace: {
    key: 'cgspace',
    label: 'CGSpace',
    dotClass: 'bg-[var(--pr-color-primary-300)]',
    badgeClass: 'bg-[var(--pr-color-primary-50)] border-[var(--pr-color-primary-100)] text-[var(--pr-color-primary-700)]',
    host: 'cgspace.cgiar.org'
  },
  melspace: {
    key: 'melspace',
    label: 'MELSpace',
    dotClass: 'bg-cyan-600',
    badgeClass: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    host: 'repo.mel.cgiar.org'
  },
  worldfish: {
    key: 'worldfish',
    label: 'WorldFish',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 border-blue-200 text-blue-800',
    host: 'digitalarchive.worldfishcenter.org'
  }
};

/** Selection and merge priority order (`KPM-DD-4`): CGSpace › MELSpace › WorldFish. */
export const ALL_KP_REPOSITORIES: readonly KpRepository[] = ['cgspace', 'melspace', 'worldfish'];

/**
 * Exact hosts *View details* may open (`KPM-DD-10`) — the three item hosts plus the
 * shared handle resolver. No wildcards: the `uri` field comes from upstream metadata.
 */
export const KP_ITEM_HOSTS: readonly string[] = [
  KP_REPOSITORIES.cgspace.host,
  KP_REPOSITORIES.melspace.host,
  KP_REPOSITORIES.worldfish.host,
  'hdl.handle.net'
];

/** Label for a repository key, falling back to the key itself for an unknown value. */
export function kpRepositoryLabel(key: string | null | undefined): string {
  if (!key) return '';
  return KP_REPOSITORIES[key as KpRepository]?.label ?? key;
}
