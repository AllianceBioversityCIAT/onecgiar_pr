import { MigrationInterface, QueryRunner } from "typeorm";

export class AddADUserTableAnnRelation1751462633282 implements MigrationInterface {
    name = 'AddADUserTableAnnRelation1751462633282'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`ad_users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`cn\` text NULL, \`display_name\` text NULL, \`mail\` varchar(320) NOT NULL, \`sam_account_name\` varchar(100) NULL, \`given_name\` varchar(255) NULL, \`sn\` varchar(255) NULL, \`user_principal_name\` varchar(255) NULL, \`title\` varchar(255) NULL, \`department\` varchar(255) NULL, \`company\` varchar(255) NULL, \`manager\` text NULL, \`employee_id\` varchar(50) NULL, \`employee_number\` varchar(50) NULL, \`employee_type\` varchar(100) NULL, \`description\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`last_synced_at\` datetime NULL, UNIQUE INDEX \`IDX_2797ab7d80c70ff16cd0aeb8b9\` (\`mail\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`lead_contact_person_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_3ea67c8c752af383130a6305ebc\` FOREIGN KEY (\`lead_contact_person_id\`) REFERENCES \`ad_users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_3ea67c8c752af383130a6305ebc\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`lead_contact_person_id\``);
        await queryRunner.query(`DROP INDEX \`IDX_2797ab7d80c70ff16cd0aeb8b9\` ON \`ad_users\``);
        await queryRunner.query(`DROP TABLE \`ad_users\``);
    }

}
