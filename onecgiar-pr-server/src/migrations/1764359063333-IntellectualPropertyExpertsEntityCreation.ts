import { MigrationInterface, QueryRunner } from "typeorm";

export class IntellectualPropertyExpertsEntityCreation1764359063333 implements MigrationInterface {
    name = 'IntellectualPropertyExpertsEntityCreation1764359063333'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`intellectual_property_experts\` (\`ip_expert_id\` bigint NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL DEFAULT 1, \`first_name\` text NULL, \`last_name\` text NULL, \`email\` text NOT NULL, \`center_code\` varchar(15) COLLATE "utf8mb3_unicode_ci" NOT NULL, PRIMARY KEY (\`ip_expert_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`intellectual_property_experts\` ADD CONSTRAINT \`FK_eecbb65f48008e3685281f8c085\` FOREIGN KEY (\`center_code\`) REFERENCES \`clarisa_center\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`intellectual_property_experts\` DROP FOREIGN KEY \`FK_eecbb65f48008e3685281f8c085\``);
        await queryRunner.query(`DROP TABLE \`intellectual_property_experts\``);
    }

}
