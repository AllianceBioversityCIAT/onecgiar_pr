import { Injectable } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResultIndicatorsRepository } from './repositories/results-toc-results-indicators.repository';
import { ResultsTocTargetIndicatorRepository } from './repositories/result-toc-result-target-indicator.repository';
import { TargetIndicator, Target } from './dto/indicators-targets.dto';
import { ResultsTocResultIndicators } from './entities/results-toc-results-indicators.entity';
import { ResultIndicatorTarget } from './entities/result-toc-result-target-indicators.entity';

@Injectable()
export class ResultsTocResultIndicatorsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultsTocResultIndicator: ResultsTocResultIndicatorsRepository,
    private readonly _resultTocIndicatorTargetRepository: ResultsTocTargetIndicatorRepository,
  ) {}

  async saveIndicatorContributing(
    targetsIndicators: TargetIndicator[],
    id_result_toc_result?: number,
  ) {
    try {
      if (id_result_toc_result) {
        await this.deactivateResultsTocResultIndicator(id_result_toc_result);
      }

      for (const targetIndicator of targetsIndicators) {
        const existingIndicator: ResultsTocResultIndicators =
          await this.findResultsTocResultIndicator(
            id_result_toc_result,
            targetIndicator.toc_results_indicator_id,
          );

        if (existingIndicator) {
          await this.updateResultsTocResultIndicator(
            existingIndicator,
            id_result_toc_result,
            targetIndicator,
          );

          await this.deactivateResultTocIndicatorTargets(existingIndicator);

          if (targetIndicator.targets) {
            for (const target of targetIndicator.targets) {
              const targetInfo: ResultIndicatorTarget =
                await this.findResultTocIndicatorTarget(
                  existingIndicator.result_toc_result_indicator_id,
                  target.number_target,
                );

              if (targetInfo) {
                await this.updateResultTocIndicatorTarget(
                  targetInfo,
                  target,
                  existingIndicator,
                );
              } else {
                await this.saveResultTocIndicatorTarget(
                  existingIndicator.result_toc_result_indicator_id,
                  target,
                );
              }
            }
          }
        } else {
          const newIndicator = await this.saveResultsTocResultIndicator(
            id_result_toc_result,
            targetIndicator.toc_results_indicator_id,
          );

          if (targetIndicator.targets) {
            for (const target of targetIndicator.targets) {
              await this.saveResultTocIndicatorTarget(
                newIndicator.result_toc_result_indicator_id,
                target,
              );
            }
          }
        }
      }
    } catch (error) {
      console.log(error);
      return this.handleRepositoryError(
        'ResultsTocResultIndicatorsService',
        'saveIndicatorContributing',
        true,
      );
    }
  }

  async deactivateResultsTocResultIndicator(idResultTocResult: number) {
    await this._resultsTocResultIndicator.update(
      { results_toc_results_id: idResultTocResult },
      { is_active: false },
    );
  }

  async findResultsTocResultIndicator(
    idResultTocResult: number,
    tocResultsIndicatorId: string,
  ) {
    return await this._resultsTocResultIndicator.findOne({
      where: {
        results_toc_results_id: idResultTocResult,
        toc_results_indicator_id: tocResultsIndicatorId,
      },
    });
  }

  async updateResultsTocResultIndicator(
    existingIndicator: ResultsTocResultIndicators,
    idResultTocResult: number,
    targetIndicator: TargetIndicator,
  ) {
    existingIndicator.is_active = true;
    await this._resultsTocResultIndicator.update(
      {
        results_toc_results_id: idResultTocResult,
        toc_results_indicator_id: targetIndicator.toc_results_indicator_id,
      },
      existingIndicator,
    );
  }

  async deactivateResultTocIndicatorTargets(existingIndicator: any) {
    await this._resultTocIndicatorTargetRepository.update(
      {
        result_toc_result_indicator_id:
          existingIndicator.result_toc_result_indicator_id,
      },
      { is_active: false },
    );
  }

  async findResultTocIndicatorTarget(
    resultTocResultIndicatorId: number,
    numberTarget: number,
  ) {
    return await this._resultTocIndicatorTargetRepository.findOne({
      where: {
        result_toc_result_indicator_id: resultTocResultIndicatorId,
        number_target: numberTarget,
      },
    });
  }

  async updateResultTocIndicatorTarget(
    targetInfo: ResultIndicatorTarget,
    target: Target,
    existingIndicator: ResultsTocResultIndicators,
  ) {
    const { result_toc_result_indicator_id } = existingIndicator;
    targetInfo.is_active = true;
    targetInfo.contributing_indicator =
      target.indicator_question == true
        ? parseFloat(target.contributing)
        : null;
    targetInfo.indicator_question = target.indicator_question;
    targetInfo.target_progress_narrative =
      target.indicator_question == true
        ? target.target_progress_narrative
        : null;

    await this._resultTocIndicatorTargetRepository.update(
      {
        result_toc_result_indicator_id: result_toc_result_indicator_id,
        number_target: target.number_target,
      },
      targetInfo,
    );
  }

  async saveResultTocIndicatorTarget(
    resultTocResultIndicatorId: number,
    target: any,
  ) {
    await this._resultTocIndicatorTargetRepository.save({
      result_toc_result_indicator_id: resultTocResultIndicatorId,
      contributing_indicator:
        target.indicator_question == 1 ? parseFloat(target.contributing) : null,
      indicator_question: target.indicator_question,
      number_target: target.number_target,
      is_active: true,
      target_progress_narrative:
        target.indicator_question == 1
          ? target.target_progress_narrative
          : null,
    });
  }

  async saveResultsTocResultIndicator(
    idResultTocResult: number,
    targetIndicator: any,
  ) {
    return await this._resultsTocResultIndicator.save({
      results_toc_results_id: idResultTocResult,
      toc_results_indicator_id: targetIndicator,
      is_active: true,
    });
  }

  handleRepositoryError(className: string, error: string, debug: boolean) {
    return this._handlersError.returnErrorRepository({
      className: className,
      error: error,
      debug: debug,
    });
  }
}
