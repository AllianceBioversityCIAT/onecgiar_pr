import { MigrationInterface, QueryRunner } from "typeorm";

export class krsDefault1666125803019 implements MigrationInterface {
    name = 'krsDefault1666125803019'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`is_krs\` \`is_krs\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`is_krs\` \`is_krs\` tinyint NOT NULL`);
    }

}
