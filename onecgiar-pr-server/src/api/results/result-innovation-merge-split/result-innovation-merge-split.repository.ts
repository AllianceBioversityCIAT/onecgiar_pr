import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import {
  InnovationTransitionType,
  ResultInnovationMergeSplit,
} from './entities/result-innovation-merge-split.entity';

export interface InnovationTransitionInput {
  target_result_id: number;
  transition_type: InnovationTransitionType;
}

@Injectable()
export class ResultInnovationMergeSplitRepository extends Repository<ResultInnovationMergeSplit> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultInnovationMergeSplit, dataSource.createEntityManager());
  }

  /**
   * Replaces the whole set of transitions declared by one result.
   *
   * Deliberately soft: rows the reporter removed are deactivated, never deleted, and a row that
   * comes back is reactivated instead of duplicated — the table carries
   * `UNIQUE (origin, target, type)`, so an insert on a returning pair would fail.
   *
   * 🛑 Called ONLY from the discontinuation save (`ResultsService.createResultGeneralInformation`).
   * Do not add a second writer: the reason this table exists at all is that `linked_result` had
   * one writer that erased everything and a second caller that triggered it from an unrelated
   * section, which is how a stored link disappears with no error (incident P2-3199).
   */
  async replaceForResult(
    originResultId: number,
    transitions: InnovationTransitionInput[],
    userId: number,
  ): Promise<void> {
    const incoming = (transitions ?? []).filter(
      (t) =>
        Number.isInteger(Number(t?.target_result_id)) && !!t?.transition_type,
    );

    const existing = await this.find({
      where: { origin_result_id: originResultId },
    });

    const keyOf = (targetId: number, type: string) => `${targetId}::${type}`;
    const incomingKeys = new Set(
      incoming.map((t) => keyOf(Number(t.target_result_id), t.transition_type)),
    );

    const toDeactivate = existing
      .filter(
        (row) =>
          row.is_active &&
          !incomingKeys.has(
            keyOf(Number(row.target_result_id), row.transition_type),
          ),
      )
      .map((row) => row.result_innovation_merge_split_id);

    if (toDeactivate.length) {
      await this.update(
        { result_innovation_merge_split_id: In(toDeactivate) },
        { is_active: false, last_updated_by: userId },
      );
    }

    const existingByKey = new Map(
      existing.map((row) => [
        keyOf(Number(row.target_result_id), row.transition_type),
        row,
      ]),
    );

    for (const transition of incoming) {
      const key = keyOf(
        Number(transition.target_result_id),
        transition.transition_type,
      );
      const row = existingByKey.get(key);

      if (row) {
        // Reactivate rather than insert: the unique index would reject a duplicate pair.
        if (!row.is_active) {
          await this.update(row.result_innovation_merge_split_id, {
            is_active: true,
            last_updated_by: userId,
          });
        }
        continue;
      }

      await this.save({
        origin_result_id: originResultId,
        target_result_id: Number(transition.target_result_id),
        transition_type: transition.transition_type,
        is_active: true,
        created_by: userId,
        last_updated_by: userId,
      });
    }
  }

  /** Active transitions declared by a result, with the target's title for display. */
  async findActiveByResult(originResultId: number): Promise<any[]> {
    const query = `
      SELECT
        rims.result_innovation_merge_split_id,
        rims.origin_result_id,
        rims.target_result_id,
        rims.transition_type,
        r.result_code AS target_result_code,
        r.title       AS target_title
      FROM result_innovation_merge_split rims
      JOIN result r ON r.id = rims.target_result_id
      WHERE rims.origin_result_id = ?
        AND rims.is_active > 0
      ORDER BY rims.result_innovation_merge_split_id;
    `;

    return this.query(query, [originResultId]).catch((err) =>
      this._handlersError.returnErrorRepository({
        error: err,
        className: ResultInnovationMergeSplitRepository.name,
        debug: true,
      }),
    );
  }
}
