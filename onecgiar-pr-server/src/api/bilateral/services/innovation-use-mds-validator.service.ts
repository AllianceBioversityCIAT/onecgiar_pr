import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateBilateralDto } from '../dto/create-bilateral.dto';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { SummaryService } from '../../results/summary/summary.service';

/**
 * P2-3428 — bilateral Innovation Use has four minimum-data standards. The
 * bilateral editor can keep incomplete drafts, but neither the external create
 * endpoint nor the internal submit-for-review transition may bypass this gate.
 *
 * This deliberately does not use the P25/W1-W2 validators: the two reporting
 * flows have different submission lifecycles and this rule is W3-only.
 */
@Injectable()
export class InnovationUseMdsValidator {
  constructor(private readonly summaryService: SummaryService) {}

  async assertExternalCreateMds(dto: CreateBilateralDto): Promise<void> {
    if (dto.result_type_id !== ResultTypeEnum.INNOVATION_USE) return;

    const current = dto.innovation_use?.current_innovation_use_numbers;
    const errors = this.collectErrors({
      actorsToBeDetermined: current?.innov_use_to_be_determined,
      actors: current?.actors,
      measures: current?.measures,
      innovationUseLevel: dto.innovation_use?.innovation_use_level,
      investments: dto.contributing_bilateral_projects?.map((project) => ({
        amount: project.usd_budget,
        isDetermined: project.is_determined,
      })),
    });

    this.throwIfIncomplete(errors);
  }

  async assertPersistedMds(resultId: number): Promise<void> {
    const summary = await this.summaryService.getInnovationUse(resultId);
    // SummaryService is also used by the controller, whose generic response type
    // includes Nest's `Type`; the persisted Innovation Use payload is the object
    // assembled by `getInnovationUse`.
    const data = summary?.response as any;
    const errors = this.collectErrors({
      actorsToBeDetermined: data?.innov_use_to_be_determined,
      actors: data?.actors,
      measures: data?.measures,
      innovationUseLevel: data?.innovation_use_level_id,
      investments: data?.investment_bilateral?.map((row) => ({
        amount: row.kind_cash,
        isDetermined: row.is_determined,
      })),
    });

    this.throwIfIncomplete(errors);
  }

  private collectErrors(input: {
    actorsToBeDetermined: unknown;
    actors: unknown;
    measures: unknown;
    innovationUseLevel: unknown;
    investments: Array<{ amount: unknown; isDetermined: unknown }> | undefined;
  }): string[] {
    const errors: string[] = [];
    const actorsToBeDetermined = input.actorsToBeDetermined;

    if (typeof actorsToBeDetermined !== 'boolean') {
      errors.push(
        'Actors: state whether innovation use is yet to be determined.',
      );
    } else if (
      actorsToBeDetermined === false &&
      (!Array.isArray(input.actors) ||
        !input.actors.some((actor) => actor && typeof actor === 'object'))
    ) {
      errors.push(
        'Actors: add at least one actor or mark innovation use as yet to be determined.',
      );
    }

    if (
      !Array.isArray(input.measures) ||
      !input.measures.some((measure) => this.isCompleteMeasure(measure))
    ) {
      errors.push(
        'Quantitative measures: add at least one measure with a unit and quantity.',
      );
    }

    if (!this.hasValue(input.innovationUseLevel)) {
      errors.push('Innovation Use level: select a level.');
    }

    if (!Array.isArray(input.investments) || input.investments.length === 0) {
      errors.push(
        'Investment by CGIAR W3 or bilateral projects: add a contributing bilateral project.',
      );
    } else if (
      input.investments.some(
        (investment) => !this.isCompleteInvestment(investment),
      )
    ) {
      errors.push(
        'Investment by CGIAR W3 or bilateral projects: every project needs a positive USD amount or "This is yet to be determined".',
      );
    }

    return errors;
  }

  private isCompleteMeasure(measure: any): boolean {
    return (
      typeof measure?.unit_of_measure === 'string' &&
      measure.unit_of_measure.trim().length > 0 &&
      measure.quantity !== null &&
      measure.quantity !== undefined &&
      measure.quantity !== '' &&
      Number.isFinite(Number(measure.quantity))
    );
  }

  private isCompleteInvestment(investment: {
    amount: unknown;
    isDetermined: unknown;
  }): boolean {
    const hasAmount = Number(investment.amount) > 0;
    const isDetermined = investment.isDetermined === true;
    return hasAmount !== isDetermined;
  }

  private hasValue(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'object') {
      const level = value as { level?: unknown; name?: unknown };
      return this.hasValue(level.level) || this.hasValue(level.name);
    }
    return true;
  }

  private throwIfIncomplete(errors: string[]): void {
    if (!errors.length) return;
    throw new BadRequestException(
      `Innovation Use cannot be submitted until its minimum data standards are complete: ${errors.join(' ')}`,
    );
  }
}
