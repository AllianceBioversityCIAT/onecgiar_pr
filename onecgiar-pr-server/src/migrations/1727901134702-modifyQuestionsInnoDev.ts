import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyQuestionsInnoDev1727901134702 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(
      `UPDATE result_questions SET question_text = 'Dedicated CGIAR expert on innovation development team' where result_question_id = 19;`,
    );
    queryRunner.query(
      `UPDATE result_questions SET question_text = 'Dedicated partner(s) with expertise in innovation development team' where result_question_id = 20;`,
    );
    queryRunner.query(
      `UPDATE result_questions SET question_text = 'Commissioned impact studies, or context analysis' where result_question_id = 22;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(
      `UPDATE result_questions SET question_text = 'Dedicated CGIAR GESI expert on innovation development team' where result_question_id = 19;`,
    );
    queryRunner.query(
      `UPDATE result_questions SET question_text = 'Dedicated partner(s) with GESI expertise in innovation development team' where result_question_id = 20;`,
    );
    queryRunner.query(
      `UPDATE result_questions SET question_text = 'Commissioned a GESI study, or context analysis' where result_question_id = 22;`,
    );
  }
}
