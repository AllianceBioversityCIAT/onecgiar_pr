import { MigrationInterface, QueryRunner } from "typeorm"

export class CreateNewYear1683214832065 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        update \`year\` 
        set active = if(\`year\` = 2023, 1, 0);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        update \`year\` 
        set active = if(\`year\` = 2022, 1, 0);`);
    }

}
