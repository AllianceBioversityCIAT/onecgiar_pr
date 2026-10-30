import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { returnFormatService } from '../../../shared/extendsGlobalDTO/returnServices.dto';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { throwServiceError } from '../../../shared/utils/service-error.util';
import { VersioningService } from '../../versioning/versioning.service';
import {
  ImpactCountsQueryDto,
  ImpactPreviousResultsSearchQueryDto,
} from './dto/impact-level-search-query.dto';
import { ImpactLevelCountsRepository } from './repositories/impact-level-counts.repository';
import { ImpactLevelSearchRepository } from './repositories/impact-level-search.repository';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const isBlank = (v: unknown) => v === undefined || v === null || v === '';
const asInt = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isInteger(v) ? v : null;
  if (typeof v !== 'string' || !/^-?\d+$/.test(v.trim())) return null;
  return Number(v.trim());
};

/** E5 / E6 (IRS-R-10, IRS-R-11): input gates and orchestration; SQL lives in the repositories. */
@Injectable()
export class ImpactLevelSearchService {
  constructor(
    private readonly _searchRepository: ImpactLevelSearchRepository,
    private readonly _countsRepository: ImpactLevelCountsRepository,
    private readonly _versioningService: VersioningService,
    private readonly _handlersError: HandlersError,
  ) {}

  async searchPreviousResults(
    query: ImpactPreviousResultsSearchQueryDto,
  ): Promise<returnFormatService> {
    try {
      const q = query ?? {};
      const page = isBlank(q.page) ? 1 : asInt(q.page);
      if (page === null || page < 1) {
        throwServiceError(
          'page must be an integer greater than or equal to 1',
          HttpStatus.BAD_REQUEST,
        );
      }
      const limit = isBlank(q.limit) ? DEFAULT_LIMIT : asInt(q.limit);
      if (limit === null || limit < 1 || limit > MAX_LIMIT) {
        throwServiceError(
          `limit must be an integer between 1 and ${MAX_LIMIT}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const versionId = this._optionalId(q.versionId, 'versionId');
      const portfolioId = this._optionalId(q.portfolioId, 'portfolioId');
      const excludeResultId = this._optionalId(
        q.excludeResultId,
        'excludeResultId',
      );
      const typeIds = this._typeIds(q.typeIds);

      const activePhase = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.REPORTING,
      );
      const { items, total } = await this._searchRepository.search({
        q: q.q,
        versionId,
        portfolioId,
        typeIds,
        excludeResultId,
        page,
        limit,
        activeVersionId: activePhase?.id ?? null,
      });

      return {
        response: {
          items,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
        },
        message: 'Previous results search',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getCounts(query: ImpactCountsQueryDto): Promise<returnFormatService> {
    try {
      const initiativeId = asInt(query?.initiativeId);
      const versionId = asInt(query?.versionId);
      if (initiativeId === null || versionId === null) {
        throwServiceError(
          'initiativeId and versionId are required integers',
          HttpStatus.BAD_REQUEST,
        );
      }
      return {
        response: await this._countsRepository.countByArea(
          initiativeId,
          versionId,
        ),
        message: 'Impact results per Impact Area',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private _optionalId(value: unknown, name: string): number | undefined {
    if (isBlank(value)) return undefined;
    const n = asInt(value);
    if (n === null || n < 1) {
      throwServiceError(`${name} must be an integer`, HttpStatus.BAD_REQUEST);
    }
    return n;
  }

  private _typeIds(value: unknown): number[] | undefined {
    if (isBlank(value)) return undefined;
    const parts = String(value)
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');
    const ids = parts.map(asInt);
    if (!ids.length || ids.some((n) => n === null || n < 1)) {
      throwServiceError(
        'typeIds must be a comma-separated list of integers',
        HttpStatus.BAD_REQUEST,
      );
    }
    return ids as number[];
  }
}
