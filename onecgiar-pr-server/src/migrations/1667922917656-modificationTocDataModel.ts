import { MigrationInterface, QueryRunner } from "typeorm";

export class modificationTocDataModel1667922917656 implements MigrationInterface {
    name = 'modificationTocDataModel1667922917656'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`toc_result\` DROP COLUMN \`work_package_short_title\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_initiatives\` ADD \`toc_id\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`toc_result\` ADD \`work_package_id\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`toc_result\` CHANGE \`toc_type_id\` \`toc_type_id\` bigint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`toc_result\` CHANGE \`toc_type_id\` \`toc_type_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`toc_result\` DROP COLUMN \`work_package_id\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_initiatives\` DROP COLUMN \`toc_id\``);
        await queryRunner.query(`ALTER TABLE \`toc_result\` ADD \`work_package_short_title\` text NULL`);
    }

}
