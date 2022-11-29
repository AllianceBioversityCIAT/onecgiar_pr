import { MigrationInterface, QueryRunner } from "typeorm"

export class migrationCaptDev1668806452093 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO \`capdevs_term\` (name, term, description) VALUES ('Long-term', 'Long-term', '3 months and above')`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
