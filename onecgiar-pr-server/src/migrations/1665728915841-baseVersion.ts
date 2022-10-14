import { MigrationInterface, QueryRunner } from "typeorm"

export class baseVersion1665728915841 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO \`version\` (version_name, start_date, end_date) VALUES ('Baseline', NULL, NULL)`,
          );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
