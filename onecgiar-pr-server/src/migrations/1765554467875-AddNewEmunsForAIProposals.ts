import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewEmunsForAIProposals1765554467875
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE ai_review_proposal
            MODIFY field_name ENUM(
                'title',
                'description',
                'short_title',
                'gender',
                'climate',
                'nutrition',
                'environmental',
                'poverty'
            ) NOT NULL;
        `);

    await queryRunner.query(`
            ALTER TABLE result_field_revision
            MODIFY field_name ENUM(
                'title',
                'description',
                'short_title',
                'gender',
                'climate',
                'nutrition',
                'environmental',
                'poverty'
            ) NOT NULL;
        `);

    await queryRunner.query(`
            ALTER TABLE result_field_ai_state
            MODIFY field_name ENUM(
                'title',
                'description',
                'short_title',
                'gender',
                'climate',
                'nutrition',
                'environmental',
                'poverty'
            ) NOT NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE result_field_revision
            MODIFY field_name ENUM(
                'title',
                'description',
                'short_title'
            ) NOT NULL;
        `);

    await queryRunner.query(`
            ALTER TABLE result_field_ai_state
            MODIFY field_name ENUM(
                'title',
                'description',
                'short_title'
            ) NOT NULL;
        `);

    await queryRunner.query(`
            ALTER TABLE ai_review_proposal
            MODIFY field_name ENUM(
                'title',
                'description',
                'short_title'
            ) NOT NULL;
        `);
  }
}
