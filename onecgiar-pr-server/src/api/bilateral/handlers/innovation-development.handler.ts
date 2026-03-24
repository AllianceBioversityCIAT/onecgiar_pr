import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  BilateralResultTypeHandler,
  HandlerAfterCreateContext,
} from './bilateral-result-type-handler.interface';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { ClarisaInnovationReadinessLevelRepository } from '../../../clarisa/clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.repository';

@Injectable()
export class InnovationDevelopmentBilateralHandler
  implements BilateralResultTypeHandler
{
  readonly resultType = ResultTypeEnum.INNOVATION_DEVELOPMENT;
  private readonly logger = new Logger(
    InnovationDevelopmentBilateralHandler.name,
  );
  private readonly typologyNameToCode = new Map<string, number>([
    ['technological innovation', 12],
    ['capacity development innovation', 13],
    ['policy, organizational or institutional innovation', 14],
    ['other/i’m not sure/this typology does not work for my innovation', 15],
    ['other/im not sure/this typology does not work for my innovation', 15],
  ]);

  constructor(
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    private readonly _clarisaInnovationReadinessLevelRepository: ClarisaInnovationReadinessLevelRepository,
  ) {}

  async afterCreate({
    bilateralDto,
    resultId,
    userId,
  }: HandlerAfterCreateContext): Promise<void> {
    if (bilateralDto.result_type_id !== ResultTypeEnum.INNOVATION_DEVELOPMENT) {
      return;
    }

    const innovation = bilateralDto.innovation_development;
    if (!innovation) {
      throw new BadRequestException(
        'innovation_development object is required for INNOVATION_DEVELOPMENT results.',
      );
    }

    const innovationNatureId = this.resolveTypologyCode(
      innovation.innovation_typology,
    );

    const readinessLevelId = await this.resolveReadinessLevelId(
      innovation.innovation_readiness_level,
    );

    if (!innovation.innovation_developers?.trim()) {
      throw new BadRequestException(
        'innovation_developers is required for INNOVATION_DEVELOPMENT results.',
      );
    }

    const existing = await this._resultsInnovationsDevRepository.findOne({
      where: { result_object: { id: resultId } },
    });

    if (existing) {
      existing.innovation_nature_id = innovationNatureId;
      existing.innovation_developers = innovation.innovation_developers;
      existing.innovation_readiness_level_id = readinessLevelId;
      existing.last_updated_by = userId;
      await this._resultsInnovationsDevRepository.save(existing);
      this.logger.debug(
        `Updated innovation development data for result ${resultId}.`,
      );
      return;
    }

    const newRecord = this._resultsInnovationsDevRepository.create({
      result_object: { id: resultId } as any,
      created_by: userId,
      is_active: true,
      short_title: bilateralDto.title,
      innovation_nature_id: innovationNatureId,
      innovation_developers: innovation.innovation_developers,
      innovation_readiness_level_id: readinessLevelId,
    });
    await this._resultsInnovationsDevRepository.save(newRecord);
    this.logger.log(
      `Stored innovation development data for result ${resultId}.`,
    );
  }

  private resolveTypologyCode(typology?: {
    code?: number;
    name?: string;
  }): number {
    if (typology?.code) {
      this.validateTypologyCode(typology.code);
      return typology.code;
    }
    if (typology?.name) {
      const normalized = typology.name.trim().toLowerCase();
      const mapped = this.typologyNameToCode.get(normalized);
      if (!mapped) {
        throw new BadRequestException(
          `Unsupported innovation typology name "${typology.name}".`,
        );
      }
      return mapped;
    }
    throw new BadRequestException(
      'innovation_typology code or name must be provided.',
    );
  }

  private validateTypologyCode(code: number) {
    if (![12, 13, 14, 15].includes(code)) {
      throw new BadRequestException(
        `Unsupported innovation typology code "${code}".`,
      );
    }
  }

  private async resolveReadinessLevelId(readinessLevel?: {
    level?: number;
    name?: string;
  }): Promise<number> {
    if (!readinessLevel) {
      throw new BadRequestException(
        'innovation_readiness_level is required for INNOVATION_DEVELOPMENT results.',
      );
    }

    if (readinessLevel.level !== undefined && readinessLevel.level !== null) {
      const found =
        await this._clarisaInnovationReadinessLevelRepository.findOne({
          where: { level: readinessLevel.level },
        });
      if (!found) {
        throw new BadRequestException(
          `Invalid innovation readiness level: ${readinessLevel.level}. Please provide a valid readiness level.`,
        );
      }
      return found.id;
    }

    if (readinessLevel.name) {
      const normalized = readinessLevel.name.trim().toLowerCase();
      const found = await this._clarisaInnovationReadinessLevelRepository
        .createQueryBuilder('irl')
        .where('LOWER(irl.name) = :name', { name: normalized })
        .getOne();
      if (!found) {
        throw new BadRequestException(
          `Invalid innovation readiness level name: "${readinessLevel.name}". Please provide a valid readiness level name.`,
        );
      }
      return found.id;
    }

    throw new BadRequestException(
      'innovation_readiness_level must provide either level (number) or name (string).',
    );
  }
}
