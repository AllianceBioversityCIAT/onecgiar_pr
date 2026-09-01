import { Injectable } from '@nestjs/common';
import { ResultsCapacityDevelopmentsRepository } from '../../results/summary/repositories/results-capacity-developments.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import {
  ComparisonResult,
  ContributionBox,
  compareResultTotal,
  defaultContributionFor,
} from '../../results/results-toc-results/achieved-value-derivation';

/**
 * P2-2932 — reads what the user typed against Section 4 and reports whether the two agree.
 *
 * Owns the data-fetching so `ContributorsPartnersService` does not grow two more repositories for
 * a concern that is not its own, and so the same check can be reused at submit time, which the
 * story asks for next.
 *
 * The rules themselves live in `achieved-value-derivation.ts` and are not repeated here. This
 * service only feeds them.
 *
 * 🛑 It never writes. `contributing_indicator` drives live progress reporting on six surfaces, and
 * the story is explicit that the field is not auto-filled: "la responsabilidad de la coherencia es
 * del usuario, y el sistema la verifica". The one value it produces is `defaultValue`, a seed for
 * a NEW empty box, which the caller applies or ignores.
 */
@Injectable()
export class ContributionConsistencyService {
  constructor(
    private readonly _capacityDevelopmentsRepository: ResultsCapacityDevelopmentsRepository,
    private readonly _resultActorRepository: ResultActorRepository,
  ) {}

  /**
   * @param resultId          the result being reported
   * @param resultTypeId      the type the result was CREATED as — not the indicator's type. An
   *                          indicator of another type has no counterpart in Section 4 and is
   *                          excluded from the comparison rather than counted as a disagreement.
   * @param boxes             every contribution box on the result, one per mapped ToC indicator
   */
  async check(
    resultId: number,
    resultTypeId: number,
    boxes: readonly ContributionBox[],
  ): Promise<ComparisonResult & { defaultValue: number | null }> {
    const [capacityDevelopment, innovationUseActors] = await Promise.all([
      this.capacityDevelopmentOf(resultId),
      this.actorsOf(resultId),
    ]);

    const comparison = compareResultTotal(
      { resultTypeId, capacityDevelopment, innovationUseActors },
      boxes,
    );

    return {
      ...comparison,
      defaultValue: defaultContributionFor(resultTypeId),
    };
  }

  /**
   * Null rather than an empty object when the section has not been filled in: an absent section is
   * "nothing to compare", not "a total of zero". The distinction is what keeps the check quiet on
   * a result nobody has got to yet.
   */
  private async capacityDevelopmentOf(resultId: number) {
    return (
      (await this._capacityDevelopmentsRepository.findOne({
        where: { result_id: resultId, is_active: true },
      })) ?? null
    );
  }

  private async actorsOf(resultId: number) {
    return this._resultActorRepository.find({
      where: { result_id: resultId, is_active: true },
    });
  }
}
