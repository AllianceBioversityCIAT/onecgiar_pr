import { MigrationInterface, QueryRunner } from 'typeorm';

export class resultQuestionTypes1692129326086 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        INSERT INTO
            result_question_types (type_description)
        VALUES
            ('container'),
            ('title'),
            ('radiobutton'),
            ('checkbox'),
            ('text');`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
