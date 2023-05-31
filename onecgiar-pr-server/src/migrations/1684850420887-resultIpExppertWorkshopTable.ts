import { MigrationInterface, QueryRunner } from "typeorm";

export class resultIpExppertWorkshopTable1684850420887 implements MigrationInterface {
    name = 'resultIpExppertWorkshopTable1684850420887'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_ip_expert_workshop_organized\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_ip_expert_workshop_organized_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`first_name\` text NOT NULL, \`last_name\` text NOT NULL, \`email\` text NULL, \`workshop_role\` text NULL, PRIMARY KEY (\`result_ip_expert_workshop_organized_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert_workshop_organized\` ADD CONSTRAINT \`FK_7f91b0ba6658ee2583b1ae1b9ae\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_expert_workshop_organized\` DROP FOREIGN KEY \`FK_7f91b0ba6658ee2583b1ae1b9ae\``);
        await queryRunner.query(`DROP TABLE \`result_ip_expert_workshop_organized\``);
    }

}
