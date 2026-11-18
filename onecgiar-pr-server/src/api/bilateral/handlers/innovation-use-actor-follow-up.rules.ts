// @akili-spec bilateral/innovation-use-actor-follow-up (BIF-T-1, design.md §4.2/§4.4/§5, BIF-DD-4, BIF-DD-7)
import { BadRequestException } from '@nestjs/common';
import {
  COUNT_UNIT_CODES,
  USE_NATURE_CODES,
  asksCountUnit,
  asksUseNature,
} from '../../results/result-actors/farmer-follow-up.constant';

export type BilateralActorWarningCode =
  | 'actor_count_unit_missing'
  | 'actor_use_nature_missing'
  | 'actor_count_unit_not_applicable'
  // retired — no longer emitted (INC-168062)
  | 'actor_use_nature_not_applicable'
  | 'actor_duplicate_merged';

/** Actor warning in `response.outcomes[].warnings[]` (design §4.2, BIF-DD-5). */
export interface BilateralActorWarning {
  field: 'innovation_use.actors';
  index: number;
  code: BilateralActorWarningCode;
  message: string;
}

export interface ActorFollowUpInput {
  actor: any;
  /** Position in `current_innovation_use_numbers.actors[]`. */
  index: number;
  /** Resolved actor type id; null/undefined when it could not be resolved. */
  actorTypeId: number | string | null | undefined;
}

export interface ActorFollowUpResult {
  /** Same length and order as the input; each row is a copy. */
  actors: any[];
  warnings: BilateralActorWarning[];
}

const FIELD = 'innovation_use.actors' as const;

/** `actor_type` catalogue id of "Other": its rows are also told apart by `other_actor_type`. */
const OTHER_ACTOR_TYPE_ID = 5;

/** Step 1: absent, `null` or `''` counts as empty. */
const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === '';

const assertCode = (
  actor: any,
  index: number,
  field: 'count_unit' | 'use_nature',
  allowed: readonly string[],
): void => {
  const value = actor[field];
  if (isEmpty(value) || allowed.includes(value)) {
    return;
  }
  throw new BadRequestException(
    `actors[${index}].${field} must be one of: ${allowed.join(', ')}; received "${String(value)}".`,
  );
};

/**
 * Pure rules for the Innovation Use actor follow-up answers (`count_unit`, `use_nature`).
 * No I/O, no logging. Throws `BadRequestException` on the first failing actor in index order.
 *
 * Rows with `is_active === false` are passed through untouched and excluded from the
 * duplicate check (they keep today's behaviour). A row whose type could not be resolved is
 * treated as "not asked" by both predicates.
 */
export const applyInnovationUseActorFollowUpRules = (
  inputs: ActorFollowUpInput[],
): ActorFollowUpResult => {
  const warnings: BilateralActorWarning[] = [];
  const actors: any[] = [];
  const seenPairs = new Set<string>();

  for (const { actor, index, actorTypeId } of inputs) {
    if (actor?.is_active === false) {
      actors.push(actor);
      continue;
    }

    const out: any = { ...actor };
    const warn = (code: BilateralActorWarningCode, message: string) =>
      warnings.push({ field: FIELD, index, code, message });

    // Step 2 (BIF-R-2, BIF-DD-7): invalid code is a 400 on any type.
    assertCode(out, index, 'count_unit', COUNT_UNIT_CODES);
    assertCode(out, index, 'use_nature', USE_NATURE_CODES);

    // Step 3 (BIF-R-7): drop count_unit where the type is not asked.
    // @akili-spec changes/innovation-use-nature-all-actors (INA-T-1, INA-R-3, INA-DD-4)
    // Step 4 is retired: use_nature is never nulled and `actor_use_nature_not_applicable` is no longer emitted.
    if (!isEmpty(out.count_unit) && !asksCountUnit(actorTypeId)) {
      out.count_unit = null;
      warn(
        'actor_count_unit_not_applicable',
        'count_unit does not apply to this actor type and was ignored.',
      );
    }

    // Steps 5-6 (BIF-R-6): missing answers are warnings.
    if (asksCountUnit(actorTypeId) && isEmpty(out.count_unit)) {
      warn(
        'actor_count_unit_missing',
        'count_unit was not provided for this actor; it was stored empty.',
      );
    }
    if (asksUseNature(actorTypeId) && isEmpty(out.use_nature)) {
      warn(
        'actor_use_nature_missing',
        'use_nature was not provided for this actor; it was stored empty.',
      );
    }

    if (asksCountUnit(actorTypeId) && out.count_unit === 'households') {
      // Step 7 (BIF-R-4)
      if (isEmpty(out.how_many)) {
        throw new BadRequestException(
          `actors[${index}].how_many is required when count_unit is households.`,
        );
      }
      // Step 8 (BIF-R-3): single total only.
      out.women = null;
      out.men = null;
      out.women_youth = null;
      out.men_youth = null;
      out.has_women = null;
      out.has_men = null;
      out.has_women_youth = null;
      out.has_men_youth = null;
      out.sex_and_age_disaggregation = true;
    }

    // Step 9 (BIF-R-11, INA-R-5, INA-DD-3): rows without result_actors_id that the v2 writer
    // would merge, on EVERY actor type. Identity = type + (other_actor_type for Other) +
    // count_unit + use_nature, empty equals empty; `out.count_unit` is already null off Farmers.
    // @akili-spec changes/innovation-use-nature-all-actors (INA-T-2)
    if (!isEmpty(actorTypeId) && isEmpty(out.result_actors_id)) {
      const part = (value: unknown) => (isEmpty(value) ? '' : String(value));
      const typeId = Number(actorTypeId);
      const key = [
        typeId,
        typeId === OTHER_ACTOR_TYPE_ID ? part(out.other_actor_type) : '',
        part(out.count_unit),
        part(out.use_nature),
      ].join('|');
      if (seenPairs.has(key)) {
        warn(
          'actor_duplicate_merged',
          'Another actor of the same type with the same count_unit and use_nature was sent; the rows are stored as one and the later one wins.',
        );
      }
      seenPairs.add(key);
    }

    actors.push(out);
  }

  return { actors, warnings };
};
