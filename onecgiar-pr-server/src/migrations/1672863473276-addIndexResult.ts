import { MigrationInterface, QueryRunner } from "typeorm";

export class addIndexResult1672863473276 implements MigrationInterface {
    name = 'addIndexResult1672863473276'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_815ce4543cd4ee4a1a7ec26f9b\` ON \`result\` (\`result_code\`, \`version_id\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_815ce4543cd4ee4a1a7ec26f9b\` ON \`result\``);
    }

}
