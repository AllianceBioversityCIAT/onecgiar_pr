import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultActor1683576239032 implements MigrationInterface {
    name = 'refactorResultActor1683576239032'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_actors\` ADD \`other_actor_type\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_actors\` DROP COLUMN \`other_actor_type\``);
    }

}
