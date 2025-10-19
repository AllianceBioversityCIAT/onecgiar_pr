import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedSourceTypeResultForBilateral1760109669859 implements MigrationInterface {
    name = 'AddedSourceTypeResultForBilateral1760109669859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`source\` enum ('Result', 'API') NULL DEFAULT 'Result'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`source\``);
    }

}
