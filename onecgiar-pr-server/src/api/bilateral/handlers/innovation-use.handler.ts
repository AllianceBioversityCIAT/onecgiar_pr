import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  BilateralResultTypeHandler,
  HandlerAfterCreateContext,
} from './bilateral-result-type-handler.interface';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { ClarisaInnovationUseLevelRepository } from '../../../clarisa/clarisa-innovation-use-levels/clarisa-innovation-use-levels.repository';
import { InnovationUseService } from '../../results-framework-reporting/innovation-use/innovation-use.service';

@Injectable()
export class InnovationUseBilateralHandler
  implements BilateralResultTypeHandler
{
  readonly resultType = ResultTypeEnum.INNOVATION_USE;
  private readonly logger = new Logger(InnovationUseBilateralHandler.name);

  constructor(
    private readonly _innovationUseService: InnovationUseService,
    private readonly _clarisaInnovationUseLevelRepository: ClarisaInnovationUseLevelRepository,
  ) {}

  async afterCreate({
    bilateralDto,
    resultId,
    userId,
  }: HandlerAfterCreateContext): Promise<void> {
    if (bilateralDto.result_type_id !== ResultTypeEnum.INNOVATION_USE) {
      return;
    }

    const innovationUse = bilateralDto.innovation_use;
    if (!innovationUse) {
      throw new BadRequestException(
        'innovation_use object is required for INNOVATION_USE results.',
      );
    }

    if (!innovationUse.current_innovation_use_numbers) {
      throw new BadRequestException(
        'current_innovation_use_numbers is required for INNOVATION_USE results.',
      );
    }

    const currentNumbers = innovationUse.current_innovation_use_numbers;
    if (currentNumbers.innov_use_to_be_determined === undefined) {
      throw new BadRequestException(
        'innov_use_to_be_determined is required in current_innovation_use_numbers.',
      );
    }

    if (
      currentNumbers.innov_use_to_be_determined === false &&
      (!currentNumbers.actors || currentNumbers.actors.length === 0)
    ) {
      throw new BadRequestException(
        'actors array is required when innov_use_to_be_determined is false.',
      );
    }

    let innovationUseLevel: number | null = null;
    if (innovationUse.innovation_use_level) {
      innovationUseLevel = await this.resolveInnovationUseLevel(
        innovationUse.innovation_use_level,
      );
    }

    const innovationUseDto = {
      has_innovation_link: false,
      // Despite its `_id` suffix, `innovation_use_level_id` carries the use LEVEL
      // (0-9), not the catalogue row id — `InnovationUseService.saveInnovationUse`
      // resolves it with `where: { level: innovation_use_level_id }`, and the pooled
      // client fills it from `response.level`. See P2-3359.
      innovation_use_level_id: innovationUseLevel,
      linked_results: [],
      readiness_level_explanation: null,
      has_scaling_studies: false,
      scaling_studies_urls: [],
      innov_use_2030_to_be_determined: true,
      innov_use_to_be_determined: currentNumbers.innov_use_to_be_determined,
      actors: currentNumbers.actors || [],
      organization: currentNumbers.organization || [],
      measures: currentNumbers.measures || [],
    };

    const userToken = { id: userId } as any;

    await this._innovationUseService.saveInnovationUse(
      innovationUseDto as any,
      resultId,
      userToken,
    );

    this.logger.log(
      `Stored innovation use data and actors for result ${resultId}.`,
    );
  }

  /**
   * Validates the requested use level against the CLARISA catalogue and returns the
   * canonical LEVEL (0-9), not the catalogue row id.
   *
   * The distinction matters: `clarisa_innovation_use_levels.id` is auto-increment
   * from 1 while `level` runs 0-9, so the two are systematically off by one.
   * Returning the id here made `InnovationUseService` — which looks the value up as
   * `where: { level: ... }` — resolve the neighbouring level for 0-8, and find nothing
   * at all for level 9, where the resulting `null.id` threw. See P2-3359.
   */
  private async resolveInnovationUseLevel(useLevel?: {
    level?: number;
    name?: string;
  }): Promise<number> {
    if (!useLevel) {
      throw new BadRequestException(
        'innovation_use_level is required when provided.',
      );
    }

    if (useLevel.level !== undefined && useLevel.level !== null) {
      const found = await this._clarisaInnovationUseLevelRepository.findOne({
        where: { level: useLevel.level },
      });
      if (!found) {
        throw new BadRequestException(
          `Invalid innovation use level: ${useLevel.level}. Please provide a valid use level.`,
        );
      }
      return found.level;
    }

    if (useLevel.name) {
      const normalized = useLevel.name.trim().toLowerCase();
      const found = await this._clarisaInnovationUseLevelRepository
        .createQueryBuilder('iul')
        .where('LOWER(iul.name) = :name', { name: normalized })
        .getOne();
      if (!found || found.level === null || found.level === undefined) {
        throw new BadRequestException(
          `Invalid innovation use level name: "${useLevel.name}". Please provide a valid use level name.`,
        );
      }
      return found.level;
    }

    throw new BadRequestException(
      'innovation_use_level must provide either level (number) or name (string).',
    );
  }
}
