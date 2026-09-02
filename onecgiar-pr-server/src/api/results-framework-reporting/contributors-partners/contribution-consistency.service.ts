import { Injectable } from '@nestjs/common';
import { ResultsCapacityDevelopmentsRepository } from '../../results/summary/repositories/results-capacity-developments.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultsPolicyChangesRepository } from '../../results/summary/repositories/results-policy-changes.repository';
import { ResultAnswerRepository } from '../../results/result-questions/repository/result-answers.repository';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import {
  ContributionBox,
  PolicyChangeData,
  POLICY_QUESTION_CAPACITY_OF_ACTORS,
  POLICY_QUESTION_POLICY_CHANGE,
  ResultComparison,
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
    private readonly _policyChangesRepository: ResultsPolicyChangesRepository,
    private readonly _resultAnswerRepository: ResultAnswerRepository,
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
  ): Promise<ResultComparison & { defaultValue: number | null }> {
    // Only the section that belongs to this result's type is read. Fetching all three would put
    // three queries on every Section 2 load to use one of them.
    const [capacityDevelopment, innovationUseActors, policyChange] =
      await Promise.all([
        Number(resultTypeId) === ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT
          ? this.capacityDevelopmentOf(resultId)
          : null,
        Number(resultTypeId) === ResultTypeEnum.INNOVATION_USE
          ? this.actorsOf(resultId)
          : [],
        Number(resultTypeId) === ResultTypeEnum.POLICY_CHANGE
          ? this.policyChangeOf(resultId)
          : null,
      ]);

    const comparison = compareResultTotal(
      { resultTypeId, capacityDevelopment, innovationUseActors, policyChange },
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

  /**
   * AC4 needs two things that live in different tables: the Policy Change row itself, and which
   * sub-category the reporter answered.
   *
   * The sub-category is NOT a column on `results_policy_changes`. It is the answer to result
   * question 49, stored one row per option in `result_answers` with `answer_boolean` true on the
   * chosen one — which is why this branch looked impossible until the question mechanism turned up.
   */
  private async policyChangeOf(
    resultId: number,
  ): Promise<PolicyChangeData | null> {
    const [policyChange, answers] = await Promise.all([
      this._policyChangesRepository.findOne({
        where: { result_id: resultId, is_active: true },
      }),
      this._resultAnswerRepository.find({
        where: { result_id: resultId, is_active: true },
      }),
    ]);

    if (!policyChange) return null;

    const answered = (answers ?? []).find(
      (answer) =>
        answer?.answer_boolean === true &&
        [
          POLICY_QUESTION_POLICY_CHANGE,
          POLICY_QUESTION_CAPACITY_OF_ACTORS,
        ].includes(Number(answer.result_question_id)),
    );

    return {
      answeredQuestionId: answered ? Number(answered.result_question_id) : null,
      policy_type_id: policyChange.policy_type_id,
      amount: policyChange.amount,
      actors_influenced: policyChange.actors_influenced,
    };
  }
}
