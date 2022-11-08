import { MigrationInterface, QueryRunner } from "typeorm";

export class noApplicablePartner1666905391345 implements MigrationInterface {
    name = 'noApplicablePartner1666905391345'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`applicable_partner\` \`no_applicable_partner\` tinyint NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`no_applicable_partner\` \`applicable_partner\` tinyint NOT NULL DEFAULT '0'`);
    }

}
