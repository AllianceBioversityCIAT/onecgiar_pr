import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3513 (backend half of P2-3272) — Innovation Development, 2026 form.
 *
 * Adds the single consolidated Intellectual Property question that replaces the
 * four current ones, under the P25 "Intellectual property rights" root, plus its
 * three level-3 radio options (Yes / Not sure / No).
 *
 * Shape copied from 1787842155469-AddGesiRiskStageQuestionsP25 (P2-3467), the
 * newest questions of this same form.
 *
 * `question_type_id`: 2 = title, 3 = radiobutton (see 1692129326086-resultQuestionTypes).
 *
 * NOT DONE HERE — retiring questions 101, 102, 103 and 138.
 * Those rows are shared by every result of the P25 **portfolio**, and the P25
 * portfolio also holds **2025-phase** results, which must keep rendering their
 * four original questions with their stored answers (governing rule of epic
 * P2-3243, PO note of 23 Aug 2026). The retirement is a phase-year gate in code,
 * exactly as P2-3467 did for 78 / 79 / 137.
 *
 * The four futures of this migration (repo rule 25):
 *   - Applied without the new code: invisible. `intellectualPropertyRightsV2`
 *     pins q1..q4 to ids 101/102/103/138 through `assignQuestionSlotsById`, which
 *     ignores any child not listed, so nothing reaches the form.
 *   - Code deployed without applying it: the phase-2026 slot resolves the question
 *     BY TEXT and comes back `undefined`, which the component already tolerates
 *     (same contract as the retired q4 of the scaling group).
 *   - Applied twice: guarded. Every INSERT is `WHERE NOT EXISTS`, because a
 *     duplicated text would make the by-text lookup ambiguous.
 *   - Reverted with data inside: `down()` refuses to delete once any answer
 *     points at these rows, so no reported answer is ever destroyed.
 *
 * Additive only: no existing row is updated, deactivated or deleted.
 */
export class AddConsolidatedIprQuestionP251788441000000
  implements MigrationInterface
{
  name = 'AddConsolidatedIprQuestionP251788441000000';

  private static readonly QUESTION_TEXT =
    'Do you have any Intellectual Property considerations for this innovation?';

  private static readonly OPTIONS = ['Yes', 'Not sure', 'No'];

  /**
   * P25 root of "Intellectual property rights". Resolved by text first: the P25
   * rows were cloned by 1762398554711-PopulateDataResultQuestions and their ids
   * come from AUTO_INCREMENT, so 100 is this environment's id, not a contract.
   */
  private static readonly IPR_ROOT_ID_FALLBACK = 100;

  /** Innovation Development. */
  private static readonly RESULT_TYPE_ID = 7;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rootId = await this.resolveIprRootId(queryRunner);

    await queryRunner.query(
      `
        INSERT INTO result_questions
          (question_text, question_description, result_type_id,
           parent_question_id, question_type_id, question_level,
           version, previous_question_id)
        SELECT ?, NULL, ?, ?, 2, 2, 'P25', NULL
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM result_questions
          WHERE question_text = ?
            AND version = 'P25'
            AND parent_question_id = ?
        );
      `,
      [
        AddConsolidatedIprQuestionP251788441000000.QUESTION_TEXT,
        AddConsolidatedIprQuestionP251788441000000.RESULT_TYPE_ID,
        rootId,
        AddConsolidatedIprQuestionP251788441000000.QUESTION_TEXT,
        rootId,
      ],
    );

    const questionId = await this.findQuestionId(queryRunner, rootId);

    if (!questionId) {
      throw new Error(
        `${AddConsolidatedIprQuestionP251788441000000.name}: the consolidated IPR question could not be found after the INSERT (root ${rootId}).`,
      );
    }

    for (const optionText of AddConsolidatedIprQuestionP251788441000000.OPTIONS) {
      await queryRunner.query(
        `
          INSERT INTO result_questions
            (question_text, question_description, result_type_id,
             parent_question_id, question_type_id, question_level,
             version, previous_question_id)
          SELECT ?, NULL, ?, ?, 3, 3, 'P25', NULL
          FROM DUAL
          WHERE NOT EXISTS (
            SELECT 1 FROM result_questions
            WHERE question_text = ?
              AND version = 'P25'
              AND parent_question_id = ?
          );
        `,
        [
          optionText,
          AddConsolidatedIprQuestionP251788441000000.RESULT_TYPE_ID,
          questionId,
          optionText,
          questionId,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rootId = await this.resolveIprRootId(queryRunner);
    const questionId = await this.findQuestionId(queryRunner, rootId);

    if (!questionId) {
      return;
    }

    const answered: { total: number }[] = await queryRunner.query(
      `
        SELECT COUNT(*) AS total
        FROM result_answers ra
          INNER JOIN result_questions rq
            ON rq.result_question_id = ra.result_question_id
        WHERE rq.result_question_id = ?
           OR rq.parent_question_id = ?;
      `,
      [questionId, questionId],
    );

    if (Number(answered?.[0]?.total ?? 0) > 0) {
      // Reported answers already point at these rows. Deleting them would drop
      // information a `git revert` cannot bring back, so the rows stay.
      return;
    }

    await queryRunner.query(
      `DELETE FROM result_questions WHERE parent_question_id = ?;`,
      [questionId],
    );

    await queryRunner.query(
      `DELETE FROM result_questions WHERE result_question_id = ?;`,
      [questionId],
    );
  }

  /** The P25 IPR root, by text; falls back to this environment's known id. */
  private async resolveIprRootId(queryRunner: QueryRunner): Promise<number> {
    const rows: { result_question_id: number }[] = await queryRunner.query(
      `
        SELECT result_question_id
        FROM result_questions
        WHERE question_text LIKE 'Intellectual property rights%'
          AND version = 'P25'
          AND question_level = 1
          AND result_type_id = ?
        ORDER BY result_question_id ASC
        LIMIT 1;
      `,
      [AddConsolidatedIprQuestionP251788441000000.RESULT_TYPE_ID],
    );

    return (
      rows?.[0]?.result_question_id ??
      AddConsolidatedIprQuestionP251788441000000.IPR_ROOT_ID_FALLBACK
    );
  }

  private async findQuestionId(
    queryRunner: QueryRunner,
    rootId: number,
  ): Promise<number | null> {
    const rows: { result_question_id: number }[] = await queryRunner.query(
      `
        SELECT result_question_id
        FROM result_questions
        WHERE question_text = ?
          AND version = 'P25'
          AND parent_question_id = ?
        ORDER BY result_question_id ASC
        LIMIT 1;
      `,
      [AddConsolidatedIprQuestionP251788441000000.QUESTION_TEXT, rootId],
    );

    return rows?.[0]?.result_question_id ?? null;
  }
}
