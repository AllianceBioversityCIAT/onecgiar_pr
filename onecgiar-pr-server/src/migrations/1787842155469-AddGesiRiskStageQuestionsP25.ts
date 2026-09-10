import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3467 (backend half of P2-3290) — Innovation Development, 2026 form.
 *
 * Adds the two structured stage-selection questions that replace the GESI and
 * risk open-text ones, under the P25 "Responsible innovation and scaling" root
 * (`result_question_id` 77).
 *
 * Shape follows the newest questions of the same group (136 / 137): one level-2
 * question plus its level-3 radio options. The "Not applicable" branch needs no
 * extra row — the required free-text reason is stored in `result_answers.answer_text`
 * of that option, the same mechanism `assumptions-examination` and
 * `partners-policies-safeguards` already use through the `textInputWhenSelectedLabels`
 * input of `app-pr-radio-button`.
 *
 * `question_type_id`: 2 = title, 3 = radiobutton (see 1692129326086-resultQuestionTypes).
 *
 * NOT DONE HERE — retiring questions 78, 79 and 137.
 * Those rows are shared by every result of the P25 **portfolio**, and the P25
 * portfolio also holds **2025-phase** results, which must keep rendering and
 * validating exactly as before (governing rule of epic P2-3243). Detaching or
 * deleting them at the data level would strip the questions from those results
 * too. The retirement is therefore a phase-year gate in code — front and server —
 * mirroring how Megatrends was handled in P2-3264
 * (`ReportingDesignYear.InnovationDevFormReduction`).
 */
export class AddGesiRiskStageQuestionsP251787842155469
  implements MigrationInterface
{
  name = 'AddGesiRiskStageQuestionsP251787842155469';

  private static readonly GESI_QUESTION =
    'What is the current stage of GESI consideration for this innovation?';

  private static readonly RISK_QUESTION =
    'What is the current stage of negative impact/risk assessment for this innovation?';

  private static readonly GESI_OPTIONS = [
    'Last-resort: GESI not considered; critical gaps remain',
    'Foundational: GESI awareness exists but no systematic integration',
    'Emerging: specific GESI strategies being tested',
    'Integrated: GESI deeply embedded in innovation design and monitoring',
    'Not applicable',
  ];

  private static readonly RISK_OPTIONS = [
    'Last-resort: no risk assessment conducted; known risks unaddressed',
    'Foundational: basic risk identification done',
    'Emerging: active mitigation strategies being tested',
    'Integrated: robust risk monitoring and adaptive management in place',
    'Not applicable',
  ];

  /** P25 root of "Responsible innovation and scaling". */
  private static readonly SCALING_ROOT_ID = 77;

  /** Innovation Development. */
  private static readonly RESULT_TYPE_ID = 7;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const gesiId = await this.insertQuestion(
      queryRunner,
      AddGesiRiskStageQuestionsP251787842155469.GESI_QUESTION,
    );
    const riskId = await this.insertQuestion(
      queryRunner,
      AddGesiRiskStageQuestionsP251787842155469.RISK_QUESTION,
    );

    await this.insertOptions(
      queryRunner,
      gesiId,
      AddGesiRiskStageQuestionsP251787842155469.GESI_OPTIONS,
    );
    await this.insertOptions(
      queryRunner,
      riskId,
      AddGesiRiskStageQuestionsP251787842155469.RISK_OPTIONS,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const questions: { result_question_id: number }[] = await queryRunner.query(
      `
        SELECT result_question_id
        FROM result_questions
        WHERE question_text IN (?, ?)
          AND version = 'P25'
          AND parent_question_id = ?;
      `,
      [
        AddGesiRiskStageQuestionsP251787842155469.GESI_QUESTION,
        AddGesiRiskStageQuestionsP251787842155469.RISK_QUESTION,
        AddGesiRiskStageQuestionsP251787842155469.SCALING_ROOT_ID,
      ],
    );

    if (!questions?.length) {
      return;
    }

    const questionIds = questions.map((q) => q.result_question_id);

    // Options first: they hold the FK to the questions.
    await queryRunner.query(
      `DELETE FROM result_questions WHERE parent_question_id IN (?);`,
      [questionIds],
    );

    await queryRunner.query(
      `DELETE FROM result_questions WHERE result_question_id IN (?);`,
      [questionIds],
    );
  }

  /** Inserts one level-2 question and returns the id the AUTO_INCREMENT assigned. */
  private async insertQuestion(
    queryRunner: QueryRunner,
    questionText: string,
  ): Promise<number> {
    const inserted = await queryRunner.query(
      `
        INSERT INTO result_questions
          (question_text, question_description, result_type_id,
           parent_question_id, question_type_id, question_level,
           version, previous_question_id)
        VALUES (?, NULL, ?, ?, 2, 2, 'P25', NULL);
      `,
      [
        questionText,
        AddGesiRiskStageQuestionsP251787842155469.RESULT_TYPE_ID,
        AddGesiRiskStageQuestionsP251787842155469.SCALING_ROOT_ID,
      ],
    );

    return inserted.insertId;
  }

  /** Inserts the level-3 radio options of a question, keeping the declared order. */
  private async insertOptions(
    queryRunner: QueryRunner,
    parentQuestionId: number,
    options: string[],
  ): Promise<void> {
    for (const optionText of options) {
      await queryRunner.query(
        `
          INSERT INTO result_questions
            (question_text, question_description, result_type_id,
             parent_question_id, question_type_id, question_level,
             version, previous_question_id)
          VALUES (?, NULL, ?, ?, 3, 3, 'P25', NULL);
        `,
        [
          optionText,
          AddGesiRiskStageQuestionsP251787842155469.RESULT_TYPE_ID,
          parentQuestionId,
        ],
      );
    }
  }
}
