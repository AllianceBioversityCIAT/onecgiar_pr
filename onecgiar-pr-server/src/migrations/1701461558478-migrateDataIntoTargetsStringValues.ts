import { MigrationInterface, QueryRunner } from 'typeorm';

export class migrateDataIntoTargetsStringValues1701461558478
  implements MigrationInterface
{
  name = 'migrateDataIntoTargetsStringValues1701461558478';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE
                result_indicators_targets rit
            SET
                target_progress_narrative = contributing_indicator
            WHERE
                contributing_indicator REGEXP '[a-zA-Z]|\[^a-zA-Z0-9]';
        `);

    await queryRunner.query(`
            UPDATE
                result_indicators_targets rit
            SET
                contributing_indicator = NULL
            WHERE
                contributing_indicator REGEXP '[a-zA-Z]|\[^a-zA-Z0-9]';
        `);

    await queryRunner.query(`
            ALTER TABLE
                result_indicators_targets
            ADD
                COLUMN contributing_indicator_tmp TEXT NULL;
        `);

    await queryRunner.query(`
        UPDATE
            result_indicators_targets rit
        SET
            contributing_indicator_tmp = contributing_indicator
        WHERE
            contributing_indicator IS NOT NULL;
        `);

    await queryRunner.query(`
        UPDATE
            result_indicators_targets rit
        SET
            contributing_indicator_tmp = NULL
        WHERE
            contributing_indicator_tmp IS NULL
            OR contributing_indicator_tmp = ''
            OR contributing_indicator_tmp = 0;
        `);

    await queryRunner.query(`
        UPDATE
            result_indicators_targets rit
        SET
            contributing_indicator = NULL
        WHERE
            contributing_indicator IS NULL
            OR contributing_indicator = ''
            OR contributing_indicator = 0;
        `);

    await queryRunner.query(`
        ALTER TABLE
            result_indicators_targets
        MODIFY
            COLUMN contributing_indicator DECIMAL(6, 2);
        `);

    await queryRunner.query(`
        UPDATE
            result_indicators_targets rit
        SET
            contributing_indicator = CAST(contributing_indicator_tmp AS DECIMAL(6, 2))
        WHERE
            contributing_indicator_tmp IS NOT NULL;
        `);

    await queryRunner.query(`
        ALTER TABLE
            result_indicators_targets
        DROP
            COLUMN contributing_indicator_tmp;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

