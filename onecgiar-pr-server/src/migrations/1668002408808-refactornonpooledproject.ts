import { MigrationInterface, QueryRunner } from "typeorm";

export class refactornonpooledproject1668002408808 implements MigrationInterface {
    name = 'refactornonpooledproject1668002408808'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` CHANGE \`grant_title\` \`grant_title\` text NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` CHANGE \`grant_title\` \`grant_title\` text NULL`);
    }

}
