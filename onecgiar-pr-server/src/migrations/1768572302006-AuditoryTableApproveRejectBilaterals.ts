import { MigrationInterface, QueryRunner } from "typeorm";

export class AuditoryTableApproveRejectBilaterals1768572302006 implements MigrationInterface {
    name = 'AuditoryTableApproveRejectBilaterals1768572302006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_review_history\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`action\` enum ('APPROVE', 'REJECT') NOT NULL, \`comment\` text NULL, \`created_by\` int NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`reviewed_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`reviewed_at\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_d0a36bb7e74b233d7f9bd7b35f5\` FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_review_history\` ADD CONSTRAINT \`FK_8be3ca3d553e37873aa7ac2a89f\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_review_history\` ADD CONSTRAINT \`FK_216724bee94e01f231a62f6bee6\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_review_history\` DROP FOREIGN KEY \`FK_216724bee94e01f231a62f6bee6\``);
        await queryRunner.query(`ALTER TABLE \`result_review_history\` DROP FOREIGN KEY \`FK_8be3ca3d553e37873aa7ac2a89f\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`reviewed_at\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`reviewed_by\``);
        await queryRunner.query(`DROP TABLE \`result_review_history\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_d0a36bb7e74b233d7f9bd7b35f5\``);
    }

}
