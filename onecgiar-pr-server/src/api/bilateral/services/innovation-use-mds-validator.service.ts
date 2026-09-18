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
    const actorsToBeDetermined = this.readStoredBoolean(
      input.actorsToBeDetermined,
    );

    if (actorsToBeDetermined === null) {
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

  /**
   * The answer as the two callers really hand it over: `true` / `false` when it is an answer,
   * `null` when the question was never answered.
   *
   * 🛑 `typeof value !== 'boolean'` was NOT a safe "unanswered" test on the persisted path.
   * `innov_use_to_be_determined` is declared `type: 'tinyint'` on the entity
   * (`api/results/summary/entities/results-innovations-use.entity.ts:112-117`) even though its TS
   * type says `boolean`, and TypeORM only hydrates a column into a real boolean when the column is
   * declared `'boolean'`. So `getInnovationUse` hands this validator a NUMBER — `1` or `0` — and
   * every answered draft was read as unanswered: NO bilateral Innovation Use could be submitted for
   * review, whatever the reporter picked, while the form itself showed the section green.
   * Reported by Cristian Gamboa on prtest, 18-Sep-2026 (result code #9479, id 11947, whose stored
   * value the API returns as `1`). `bilateral.service.ts:3216` already coerced the same field with
   * `!!`, so the shape was known — just not here.
   *
   * ⚠️ The entity is deliberately left alone: that column is also read by the raw `SELECT`s in
   * `result.repository.ts` and by the Results Framework module, so re-typing it would change what
   * those callers receive in order to fix a bug that lives in this one file.
   */
  private readStoredBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (value === 1 || value === 0) return value === 1;
    if (value === '1' || value === '0') return value === '1';
    return null;
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
