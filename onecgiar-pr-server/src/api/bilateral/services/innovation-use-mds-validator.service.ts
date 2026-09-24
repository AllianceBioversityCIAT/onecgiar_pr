import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateBilateralDto } from '../dto/create-bilateral.dto';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { SummaryService } from '../../results/summary/summary.service';

/**
 * P2-3428 — bilateral Innovation Use minimum-data standards. The bilateral editor
 * can keep incomplete drafts, but neither the external create endpoint nor the
 * internal submit-for-review transition may bypass this gate.
 *
 * This deliberately does not use the P25/W1-W2 validators: the two reporting
 * flows have different submission lifecycles and this rule is W3-only.
 *
 * P2-3785 AC1 (Nicoleta Trifa, #INC-163204 point 4a, 21-Sep-2026): **three** standards
 * now, not four — the Innovation Use LEVEL was withdrawn from the standard and no longer
 * holds a submission back. Removed here and not merely in the form: this gate answers
 * both `submitForReview` and `POST /api/bilateral/create`, so a client-only change would
 * have left external producers refused by an ingest rule nobody could see, and reporters
 * looking at a green section that the Submit button rejects. Results already stored
 * without a use level become submittable; none becomes invalid, because this only ever
 * refused — it never wrote.
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
      investments: dto.contributing_bilateral_projects?.map((project) => ({
        amount: project.usd_budget,
        isDetermined: project.is_determined,
        label: project.grant_title,
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
      investments: data?.investment_bilateral?.map((row) => ({
        amount: row.kind_cash,
        isDetermined: row.is_determined,
        label: row.name,
      })),
    });

    this.throwIfIncomplete(errors);
  }

  private collectErrors(input: {
    actorsToBeDetermined: unknown;
    actors: unknown;
    measures: unknown;
    investments:
      | Array<{ amount: unknown; isDetermined: unknown; label?: unknown }>
      | undefined;
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
      actorsToBeDetermined === false &&
      Array.isArray(input.measures) &&
      input.measures.length > 0 &&
      !input.measures.some((measure) => this.isCompleteMeasure(measure))
    ) {
      errors.push(
        'Quantitative measures: add at least one measure with a unit and quantity.',
      );
    }

    if (!Array.isArray(input.investments) || input.investments.length === 0) {
      errors.push(
        'Investment by CGIAR W3 or bilateral projects: add a contributing bilateral project.',
      );
    } else {
      // Named, not merely counted: a result contributed to by several projects used to get "every
      // project needs..." with no way to tell WHICH one was short, and the reporter — looking at the
      // one row they had filled — read the whole message as a false alarm (result code 9506,
      // AfricaRice, 21-Sep-2026). The offending project is the only thing that makes this
      // actionable.
      const incomplete = input.investments
        // Position captured BEFORE the filter: the fallback label counts rows of the investment
        // table the reporter is looking at, not rows of this error list.
        .map((investment, index) => ({ ...investment, position: index + 1 }))
        // P2-3819: the contributing project itself remains mandatory, but its
        // investment amount is optional for Innovation Use.
        .filter((investment) => !this.hasProject(investment));
      if (incomplete.length) {
        errors.push(
          `Investment by CGIAR W3 or bilateral projects: every project must be identified — still missing on ${this.describeInvestments(incomplete)}.`,
        );
      }
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

  /**
   * The projects the reporter has to go and fix, by the same name the investment table shows them
   * under. A link whose CLARISA project could not be resolved carries no name at all
   * (`result-investment.service.ts` maps `name` from the relation), so it is described by position
   * rather than dropped — a nameless row is exactly the one worth pointing at.
   */
  private describeInvestments(
    investments: Array<{ label?: unknown; position: number }>,
  ): string {
    return investments
      .map((investment) => {
        const label = `${investment.label ?? ''}`.trim();
        return label.length ? `"${label}"` : `project #${investment.position}`;
      })
      .join(', ');
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

  private hasProject(investment: { label?: unknown }): boolean {
    return `${investment.label ?? ''}`.trim().length > 0;
  }

  private throwIfIncomplete(errors: string[]): void {
    if (!errors.length) return;
    throw new BadRequestException(
      `Innovation Use cannot be submitted until its minimum data standards are complete: ${errors.join(' ')}`,
    );
  }
}
