import { MigrationInterface, QueryRunner } from "typeorm";

export class createresultIpExpertises1681844064245 implements MigrationInterface {
    name = 'createresultIpExpertises1681844064245'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_ip_expertises\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_ip_expertises_id\` bigint NOT NULL AUTO_INCREMENT, \`result_ip_expert_id\` bigint NOT NULL, \`expertises_id\` bigint NOT NULL, PRIMARY KEY (\`result_ip_expertises_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` DROP FOREIGN KEY \`FK_bc7982d7c0734d1bb55a6b30a74\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` CHANGE \`expertises_id\` \`expertises_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` ADD CONSTRAINT \`FK_bc7982d7c0734d1bb55a6b30a74\` FOREIGN KEY (\`expertises_id\`) REFERENCES \`expertises\`(\`expertises_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expertises\` ADD CONSTRAINT \`FK_f56680c3a8b481857968a80cd44\` FOREIGN KEY (\`result_ip_expert_id\`) REFERENCES \`result_ip_expert\`(\`result_ip_expert_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expertises\` ADD CONSTRAINT \`FK_8db4d9f48ec0280a4409da85811\` FOREIGN KEY (\`expertises_id\`) REFERENCES \`expertises\`(\`expertises_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expertises\` ADD CONSTRAINT \`FK_4976585652ceb2f3e0390068c9c\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_expertises\` DROP FOREIGN KEY \`FK_4976585652ceb2f3e0390068c9c\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_expertises\` DROP FOREIGN KEY \`FK_8db4d9f48ec0280a4409da85811\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_expertises\` DROP FOREIGN KEY \`FK_f56680c3a8b481857968a80cd44\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` DROP FOREIGN KEY \`FK_bc7982d7c0734d1bb55a6b30a74\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` CHANGE \`expertises_id\` \`expertises_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` ADD CONSTRAINT \`FK_bc7982d7c0734d1bb55a6b30a74\` FOREIGN KEY (\`expertises_id\`) REFERENCES \`expertises\`(\`expertises_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`DROP TABLE \`result_ip_expertises\``);
    }

}
