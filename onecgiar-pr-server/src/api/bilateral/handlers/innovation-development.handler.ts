import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  BilateralResultTypeHandler,
  HandlerAfterCreateContext,
} from './bilateral-result-type-handler.interface';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsDev } from '../../results/summary/entities/results-innovations-dev.entity';

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
    const readinessLevelId = innovation.innovation_readiness_level;
    if (!readinessLevelId) {
      throw new BadRequestException(
        'innovation_readiness_level is required for INNOVATION_DEVELOPMENT results.',
      );
    }
    if (!innovation.innovation_developers?.trim()) {
      throw new BadRequestException(
        'innovation_developers is required for INNOVATION_DEVELOPMENT results.',
      );
    }

    const existing = await this._resultsInnovationsDevRepository.findOne({
      where: { results_id: resultId },
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

    const payload: Partial<ResultsInnovationsDev> = {
      results_id: resultId,
      created_by: userId,
      is_active: true,
      short_title: bilateralDto.title,
      innovation_nature_id: innovationNatureId,
      innovation_developers: innovation.innovation_developers,
      innovation_readiness_level_id: readinessLevelId,
    };
    await this._resultsInnovationsDevRepository.save(
      this._resultsInnovationsDevRepository.create(payload),
    );
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
}
