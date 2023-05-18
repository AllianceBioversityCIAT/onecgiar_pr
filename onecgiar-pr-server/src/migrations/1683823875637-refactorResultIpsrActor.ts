import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultIpsrActor1683823875637 implements MigrationInterface {
    name = 'refactorResultIpsrActor1683823875637'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` ADD \`other_actor_type\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` DROP COLUMN \`other_actor_type\``);
    }

}
