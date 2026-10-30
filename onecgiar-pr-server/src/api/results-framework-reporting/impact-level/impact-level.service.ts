import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { returnFormatService } from '../../../shared/extendsGlobalDTO/returnServices.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { throwServiceError } from '../../../shared/utils/service-error.util';
import { Result } from '../../results/entities/result.entity';
import { ImpactStudyType } from './entities/impact-study-type.entity';
import { ResultImpactLevel } from './entities/result-impact-level.entity';
import { ResultImpactPreviousResult } from './entities/result-impact-previous-result.entity';
import { SaveImpactLevelDto } from './dto/save-impact-level.dto';
import {
  ImpactLevelInfoDto,
  ImpactPreviousResultItem,
} from './dto/impact-level-info.dto';
import { countWords } from './utils/count-words';

const MAX_CONTRIBUTION_WORDS = 100;
const MAX_CONTRIBUTION_CHARS = 5000;

interface ValidatedFields {
  impact_study_type_id?: number | null;
  cgiar_contribution?: string | null;
  previously_reported?: boolean | null;
  previousResultIds?: number[];
}

@Injectable()
export class ImpactLevelService {
  private readonly _logger = new Logger(ImpactLevelService.name);

  constructor(
    @InjectRepository(ImpactStudyType)
    private readonly _impactStudyTypeRepository: Repository<ImpactStudyType>,
    private readonly _dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {}

  /** E2 (IRS-R-3): active study types with their definitions. */
  async getStudyTypes(): Promise<returnFormatService> {
    try {
      const rows = await this._impactStudyTypeRepository.find({
        where: { is_active: true },
        order: { id: 'ASC' },
      });
      return {
        response: rows.map((r) => ({
          id: r.id,
          name: r.name,
          definition: r.definition,
        })),
        message: 'Impact study types',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /** E3 (IRS-R-4): the section DTO; null-safe when it was never saved. */
  async getImpactLevelInfo(
    resultId: number | string,
  ): Promise<returnFormatService> {
    try {
      const id = await this._assertImpactResult(resultId);
      return {
        response: await this._buildSection(id),
        message: 'Impact level info',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * E4 (IRS-R-5): validate everything first (no write, no transaction), then upsert the section
   * row and sync the links in ONE transaction. Fields that are not sent stay as stored.
   */
  async saveImpactLevelInfo(
    resultId: number | string,
    dto: SaveImpactLevelDto,
    user: TokenDto,
  ): Promise<returnFormatService> {
    try {
      const id = await this._assertImpactResult(resultId);
      const body = dto ?? {};
      const fields = await this._validateFields(id, body);
      const userId = user?.id;

      await this._dataSource.transaction(async (manager) => {
        await this._upsertLevel(manager, id, fields, userId);
        if (body.previously_reported === false) {
          await this._syncLinks(manager, id, [], userId);
        } else if (fields.previousResultIds) {
          await this._syncLinks(manager, id, fields.previousResultIds, userId);
        }
      });

      return {
        response: await this._buildSection(id),
        message: 'Impact level info saved',
        status: HttpStatus.OK,
      };
    } catch (error) {
      // Only the rule name and ids are logged (design section 9), never the payload text.
      if (error?.status >= 400 && error?.status < 500) {
        this._logger.warn(
          `Impact level request rejected (result ${resultId}, user ${user?.id}): ${error.message}`,
        );
      }
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /** Parses the id, loads the result (404) and requires type 9 (400). Returns the numeric id. */
  private async _assertImpactResult(
    resultId: number | string,
  ): Promise<number> {
    const id = Number(resultId);
    if (!Number.isInteger(id) || id <= 0) {
      throwServiceError('Invalid result id', HttpStatus.BAD_REQUEST);
    }
    const result = await this._dataSource.manager.findOne(Result, {
      where: { id },
      select: { id: true, result_type_id: true, is_active: true },
    });
    if (!result?.is_active) {
      throwServiceError('Result not found', HttpStatus.NOT_FOUND);
    }
    if (Number(result.result_type_id) !== ResultTypeEnum.IMPACT_CONTRIBUTION) {
      throwServiceError('Not an impact result', HttpStatus.BAD_REQUEST);
    }
    return id;
  }

  /** Validates what was sent; `undefined` means "not sent" (left untouched). */
  private async _validateFields(
    resultId: number,
    body: SaveImpactLevelDto,
  ): Promise<ValidatedFields> {
    const out: ValidatedFields = {};

    if (body.impact_study_type_id !== undefined) {
      const typeId = body.impact_study_type_id;
      if (typeId !== null) {
        const exists =
          typeof typeId === 'number' && Number.isInteger(typeId)
            ? await this._impactStudyTypeRepository.findOne({
                where: { id: typeId, is_active: true },
              })
            : null;
        if (!exists) {
          throwServiceError('Invalid impact study type');
        }
      }
      out.impact_study_type_id = typeId;
    }

    if (body.cgiar_contribution !== undefined) {
      const text = body.cgiar_contribution;
      if (text !== null) {
        if (typeof text !== 'string') {
          throwServiceError('cgiar_contribution must be a string');
        }
        if (text.length > MAX_CONTRIBUTION_CHARS) {
          throwServiceError(
            `The contribution statement must have at most ${MAX_CONTRIBUTION_CHARS} characters`,
          );
        }
        if (countWords(text) > MAX_CONTRIBUTION_WORDS) {
          throwServiceError(
            `The contribution statement must have at most ${MAX_CONTRIBUTION_WORDS} words`,
          );
        }
      }
      out.cgiar_contribution = text;
    }

    if (body.previously_reported !== undefined) {
      if (
        body.previously_reported !== null &&
        typeof body.previously_reported !== 'boolean'
      ) {
        throwServiceError('previously_reported must be a boolean');
      }
      out.previously_reported = body.previously_reported;
    }

    // "No" deactivates every link and requires nothing else (Scenario 5.3): ids are ignored.
    if (
      body.previous_result_ids !== undefined &&
      body.previously_reported !== false
    ) {
      out.previousResultIds = await this._validateLinkIds(
        resultId,
        body.previous_result_ids,
      );
    }
    return out;
  }

  /** Dedupes and checks the ids: integers, not self, existing and active (any phase/portfolio). */
  private async _validateLinkIds(
    resultId: number,
    raw: unknown,
  ): Promise<number[]> {
    if (
      !Array.isArray(raw) ||
      !raw.every((v) => typeof v === 'number' && Number.isInteger(v) && v > 0)
    ) {
      throwServiceError('previous_result_ids must be an array of result ids');
    }
    const ids = [...new Set(raw as number[])];
    if (ids.includes(resultId)) {
      throwServiceError('An impact result cannot be linked to itself');
    }
    if (ids.length) {
      const found = await this._dataSource.manager.find(Result, {
        where: { id: In(ids), is_active: true },
        select: { id: true },
      });
      const foundIds = new Set(found.map((r) => Number(r.id)));
      const missing = ids.filter((id) => !foundIds.has(id));
      if (missing.length) {
        throwServiceError(
          `Previous results do not exist or are inactive: ${missing.join(', ')}`,
        );
      }
    }
    return ids;
  }

  private async _upsertLevel(
    manager: EntityManager,
    resultId: number,
    fields: ValidatedFields,
    userId: number,
  ): Promise<void> {
    const sent = {
      ...(fields.impact_study_type_id !== undefined && {
        impact_study_type_id: fields.impact_study_type_id,
      }),
      ...(fields.cgiar_contribution !== undefined && {
        cgiar_contribution: fields.cgiar_contribution,
      }),
      ...(fields.previously_reported !== undefined && {
        previously_reported: fields.previously_reported,
      }),
    };
    const existing = await manager.findOne(ResultImpactLevel, {
      where: { result_id: resultId },
    });
    if (existing) {
      await manager.update(
        ResultImpactLevel,
        { result_id: resultId },
        { ...sent, is_active: true, last_updated_by: userId },
      );
    } else {
      await manager.insert(ResultImpactLevel, {
        result_id: resultId,
        impact_study_type_id: null,
        cgiar_contribution: null,
        previously_reported: null,
        ...sent,
        is_active: true,
        created_by: userId,
        last_updated_by: userId,
      });
    }
  }

  /** Set semantics: present ids active (insert/reactivate), absent ids deactivated. */
  private async _syncLinks(
    manager: EntityManager,
    resultId: number,
    wanted: number[],
    userId: number,
  ): Promise<void> {
    const existing = await manager.find(ResultImpactPreviousResult, {
      where: { result_id: resultId },
    });
    const byPrevious = new Map(
      existing.map((l) => [Number(l.previous_result_id), l]),
    );
    const wantedSet = new Set(wanted);

    for (const link of existing) {
      if (link.is_active && !wantedSet.has(Number(link.previous_result_id))) {
        await manager.update(
          ResultImpactPreviousResult,
          { id: link.id },
          { is_active: false, last_updated_by: userId },
        );
      }
    }
    for (const previousId of wantedSet) {
      const link = byPrevious.get(previousId);
      if (!link) {
        await manager.insert(ResultImpactPreviousResult, {
          result_id: resultId,
          previous_result_id: previousId,
          is_active: true,
          created_by: userId,
          last_updated_by: userId,
        });
      } else if (!link.is_active) {
        await manager.update(
          ResultImpactPreviousResult,
          { id: link.id },
          { is_active: true, last_updated_by: userId },
        );
      }
    }
  }

  private async _buildSection(resultId: number): Promise<ImpactLevelInfoDto> {
    const manager = this._dataSource.manager;
    const level = await manager.findOne(ResultImpactLevel, {
      where: { result_id: resultId, is_active: true },
    });
    const rows: Array<Record<string, any>> = await manager
      .createQueryBuilder(ResultImpactPreviousResult, 'link')
      .innerJoin('link.obj_previous_result', 'prev')
      .leftJoin('prev.obj_result_type', 'rtype')
      .leftJoin('prev.obj_version', 'version')
      .leftJoin('version.obj_portfolio', 'portfolio')
      .leftJoin('prev.obj_status', 'status')
      .select([
        'prev.id AS result_id',
        'prev.result_code AS result_code',
        'prev.title AS title',
        'rtype.name AS result_type_name',
        'version.phase_name AS phase_name',
        'portfolio.acronym AS portfolio_acronym',
        'status.status_name AS status_name',
      ])
      .where('link.result_id = :resultId', { resultId })
      .andWhere('link.is_active = :active', { active: true })
      .orderBy('link.id', 'ASC')
      .getRawMany();

    const previous_results: ImpactPreviousResultItem[] = rows.map((r) => ({
      result_id: Number(r.result_id),
      result_code: Number(r.result_code),
      title: r.title,
      result_type_name: r.result_type_name ?? null,
      phase_name: r.phase_name ?? null,
      portfolio_acronym: r.portfolio_acronym ?? null,
      status_name: r.status_name ?? null,
    }));

    return {
      impact_study_type_id: level?.impact_study_type_id ?? null,
      cgiar_contribution: level?.cgiar_contribution ?? null,
      previously_reported: level?.previously_reported ?? null,
      previous_results,
    };
  }
}
