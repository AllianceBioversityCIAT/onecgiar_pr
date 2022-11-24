import { MigrationInterface, QueryRunner } from "typeorm";

export class nullableGrantTitle1668617049148 implements MigrationInterface {
    name = 'nullableGrantTitle1668617049148'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` CHANGE \`grant_title\` \`grant_title\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` CHANGE \`grant_title\` \`grant_title\` text NOT NULL`);
    }

}
