// @akili-spec bilateral/innovation-use-actor-follow-up (BIF-T-1, design.md §4.2/§4.4/§5, BIF-DD-4, BIF-DD-7)
import { BadRequestException } from '@nestjs/common';
import {
  COUNT_UNIT_CODES,
  FARMERS_ACTOR_TYPE_ID,
  USE_NATURE_CODES,
  asksCountUnit,
  asksUseNature,
} from '../../results/result-actors/farmer-follow-up.constant';

export type BilateralActorWarningCode =
  | 'actor_count_unit_missing'
  | 'actor_use_nature_missing'
  | 'actor_count_unit_not_applicable'
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

    // Steps 3-4 (BIF-R-7): drop what the type is not asked.
    if (!isEmpty(out.count_unit) && !asksCountUnit(actorTypeId)) {
      out.count_unit = null;
      warn(
        'actor_count_unit_not_applicable',
        'count_unit does not apply to this actor type and was ignored.',
      );
    }
    if (!isEmpty(out.use_nature) && !asksUseNature(actorTypeId)) {
      out.use_nature = null;
      warn(
        'actor_use_nature_not_applicable',
        'use_nature does not apply to this actor type and was ignored.',
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

    // Step 9 (BIF-R-11): Farmers rows without result_actors_id that the writer would merge.
    if (
      Number(actorTypeId) === FARMERS_ACTOR_TYPE_ID &&
      isEmpty(out.result_actors_id)
    ) {
      const key = `${out.count_unit ?? ''}|${out.use_nature ?? ''}`;
      if (seenPairs.has(key)) {
        warn(
          'actor_duplicate_merged',
          'Another Farmers actor with the same count_unit and use_nature was sent; the rows are stored as one and the later one wins.',
        );
      }
      seenPairs.add(key);
    }

    actors.push(out);
  }

  return { actors, warnings };
};
