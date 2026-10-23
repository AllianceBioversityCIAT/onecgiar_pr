import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KpRepository, ProjectScope } from '../repositories.config';

export class CgspacePageMetaDto {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;

  /**
   * True when any ok source reports a next page (`KPM-R-20`).
   *
   * Always present on the endpoint response — hence `@ApiProperty`. It stays optional in
   * TypeScript only because `CgspaceDiscoveryMapper.toPage` reuses this class for the *per-source*
   * page it builds before the merge, where `hasMore` is not yet known. Consumers of the endpoint
   * should type the response as `CgspaceMergedSearchPageDto`, which requires it.
   */
  @ApiProperty({
    description: 'True when any ok source reports a next page.',
  })
  hasMore?: boolean;
}

/** Secondary handle for an item dropped by dedup and kept on the survivor's `alsoIn[]`. */
export class CgspaceAlsoInDto {
  @ApiProperty({ enum: ['cgspace', 'melspace', 'worldfish'] })
  repository: KpRepository;

  handle: string;
  handleUrl: string;
  itemUrl: string;
}

// @akili-spec changes/kp-related-relevance-ranking
/** Why a related item ranks where it does (`KRR-R-3`): satisfied factors and the tier by their count. */
export class CgspaceProjectMatchDto {
  @ApiProperty({ enum: ['strong', 'partial', 'weak', 'none'] })
  tier: 'strong' | 'partial' | 'weak' | 'none';

  @ApiProperty({
    description:
      'Satisfied factors, always in the order keywords, center, program.',
    enum: ['keywords', 'center', 'program'],
    isArray: true,
  })
  factors: ('keywords' | 'center' | 'program')[];
}

export class CgspaceItemDto {
  uuid: string;
  handle: string;
  handleUrl: string;
  itemUrl: string;
  title: string;
  type: string;
  year: number | null;
  authors: string[];
  affiliations: string[];
  countries: string[];
  doi: string | null;
  uri: string;

  /** Always set by the mapper from `adapter.key` (`KPM-T-3`, `KPM-R-8`). */
  @ApiProperty({
    description:
      'Repository this item was returned by (the survivor repository after dedup).',
    enum: ['cgspace', 'melspace', 'worldfish'],
  })
  repository: KpRepository;

  @ApiPropertyOptional({
    description:
      'Other repositories this item (deduped) was also found in, with their own handles.',
    type: () => [CgspaceAlsoInDto],
  })
  alsoIn?: CgspaceAlsoInDto[];

  @ApiPropertyOptional({
    description:
      'Science Programs or Accelerators tagged on the item from cg.contributor.programAccelerator',
    type: [String],
  })
  programAccelerators?: string[];

  @ApiPropertyOptional({
    description:
      'Project labels tagged on the item: cg.identifier.project (CGSpace) or cg.contributor.project (MELSpace/WorldFish), unioned and deduped',
    type: [String],
  })
  projects?: string[];

  // @akili-spec changes/kp-related-relevance-ranking
  @ApiPropertyOptional({
    description:
      'Subject values (dcterms.subject on CGSpace, dc.subject on MELSpace/WorldFish).',
    type: [String],
  })
  subjects?: string[];

  @ApiPropertyOptional({
    description:
      'Present only on items of a ranked related page: which project factors the item satisfies.',
    type: () => CgspaceProjectMatchDto,
  })
  projectMatch?: CgspaceProjectMatchDto;
}

export type SourceStatus = 'ok' | 'timeout' | 'error' | 'unconfigured';

/** Per-repository fan-out outcome for one search/facet request (`KPM-R-8`). */
export class SourceStatusDto {
  @ApiProperty({ enum: ['cgspace', 'melspace', 'worldfish'] })
  repository: KpRepository;

  @ApiProperty({ enum: ['ok', 'timeout', 'error', 'unconfigured'] })
  status: SourceStatus;

  @ApiProperty({
    description: "This source's raw totalElements (never dedup-adjusted).",
  })
  total: number;

  @ApiProperty({
    description: 'True when this source alone reports a next page.',
  })
  hasMore: boolean;
}

/** `projectScope` echo (`design.md` §7): `applied=false` when the project is too generic to constrain. */
export class CgspaceProjectScopeDto {
  @ApiProperty({ enum: ['linked', 'related'] })
  scope: ProjectScope;

  @ApiProperty({
    description:
      'False when the project yields neither >= 2 distinctive title words nor a PJ code.',
  })
  applied: boolean;

  // @akili-spec changes/kp-related-relevance-ranking
  @ApiProperty({
    description:
      'True when the related query carries the project relevance block, i.e. the items are ordered by relevance instead of newest first.',
  })
  ranked: boolean;

  // @akili-spec changes/kp-related-strongest-first
  @ApiProperty({
    description:
      'True only when the "only related KPs" filter was applied on every repository: requested, ranked and the full relevance block fit. When false, the list is the unfiltered related list.',
  })
  relatedOnly: boolean;
}

export class CgspaceSearchPageDto {
  items: CgspaceItemDto[];
  page: CgspacePageMetaDto;

  /**
   * One row per selected repository, in selection order (`KPM-R-8`).
   *
   * Always present on the endpoint response — hence `@ApiProperty`. Optional in TypeScript only
   * because `CgspaceDiscoveryMapper.toPage` reuses this class for the per-source page it builds
   * before the fan-out is assembled. See `CgspaceMergedSearchPageDto`.
   */
  @ApiProperty({ type: () => [SourceStatusDto] })
  sources?: SourceStatusDto[];

  /**
   * Echo of the project scope the search ran with (`KPSF-R-9`). Present only when the request
   * carried a project scope (or the legacy `project`); absent on the non-bilateral path.
   */
  @ApiPropertyOptional({ type: () => CgspaceProjectScopeDto })
  projectScope?: CgspaceProjectScopeDto;
}

/**
 * The merged, service-level page meta (`design.md` §4.1): `hasMore` is always populated once the
 * fan-out has settled.
 */
export interface CgspaceMergedPageMetaDto extends CgspacePageMetaDto {
  hasMore: boolean;
}

/**
 * The frozen search response contract (`design.md` §4.1, `KPM-R-8`) — what
 * `CgspaceDiscoveryService.search` returns and what the client (`KPM-T-6`/`KPM-T-7`) consumes:
 * `page.hasMore` and `sources[]` are guaranteed, on every status including the 502 wrapper.
 *
 * It narrows `CgspaceSearchPageDto` rather than tightening it in place so the mapper's per-source
 * output — built before the merge, without `hasMore`/`sources` — keeps type-checking.
 */
export interface CgspaceMergedSearchPageDto extends CgspaceSearchPageDto {
  page: CgspaceMergedPageMetaDto;
  sources: SourceStatusDto[];
}
