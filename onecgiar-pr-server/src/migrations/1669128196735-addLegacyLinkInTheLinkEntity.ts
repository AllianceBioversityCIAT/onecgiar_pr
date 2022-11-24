import { MigrationInterface, QueryRunner } from "typeorm";

export class addLegacyLinkInTheLinkEntity1669128196735 implements MigrationInterface {
    name = 'addLegacyLinkInTheLinkEntity1669128196735'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`linked_result\` ADD \`legacy_link\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`linked_result\` DROP COLUMN \`legacy_link\``);
    }

}
