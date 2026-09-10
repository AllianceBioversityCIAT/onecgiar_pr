import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KpRepository } from '../repositories.config';

export class CgspacePageMetaDto {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;

  // Optional for now (KPM-T-2): the mapper/service populate it once the fan-out lands (KPM-T-4).
  @ApiPropertyOptional({
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

  // Optional for now (KPM-T-2): the mapper populates it from `adapter.key` once it takes an
  // adapter parameter (KPM-T-3).
  @ApiPropertyOptional({
    description:
      'Repository this item was returned by (the survivor repository after dedup).',
    enum: ['cgspace', 'melspace', 'worldfish'],
  })
  repository?: KpRepository;

  @ApiPropertyOptional({
    description:
      'Other repositories this item (deduped) was also found in, with their own handles.',
    type: () => [CgspaceAlsoInDto],
  })
  alsoIn?: CgspaceAlsoInDto[];
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

export class CgspaceSearchPageDto {
  items: CgspaceItemDto[];
  page: CgspacePageMetaDto;

  // Optional for now (KPM-T-2): the service populates it once the fan-out lands (KPM-T-4).
  @ApiPropertyOptional({ type: () => [SourceStatusDto] })
  sources?: SourceStatusDto[];
}
