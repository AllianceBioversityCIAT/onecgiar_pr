import { MigrationInterface, QueryRunner } from "typeorm";

export class PlatformReports1683161622612 implements MigrationInterface {
    name = 'PlatformReports1683161622612'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`platform_report\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`function_data_name\` text NOT NULL, \`template_id\` bigint NOT NULL, \`version_id\` bigint NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_by\` int NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`last_updated_by\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`template\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`template\` text NOT NULL, \`parent_id\` bigint NULL, \`version_id\` bigint NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_by\` int NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`last_updated_by\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`platform_report\` ADD CONSTRAINT \`FK_bef087d503eb67c6d679ed1a5f7\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`platform_report\` ADD CONSTRAINT \`FK_68d8ad4e732fa1b102100497f2d\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`platform_report\` ADD CONSTRAINT \`FK_6e0790be1cf874619fcf852d209\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`platform_report\` ADD CONSTRAINT \`FK_c8f7b24ef3af410835123236a17\` FOREIGN KEY (\`template_id\`) REFERENCES \`template\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`template\` ADD CONSTRAINT \`FK_62f98f348ef41cda3ea6c48c0f6\` FOREIGN KEY (\`parent_id\`) REFERENCES \`template\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`template\` ADD CONSTRAINT \`FK_5c57453edc10a775036dd2f2124\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`template\` ADD CONSTRAINT \`FK_941289df174d4ece7998279a6cf\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`template\` ADD CONSTRAINT \`FK_3da101e5b24ae2d640112d5bdbb\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_3da101e5b24ae2d640112d5bdbb\``);
        await queryRunner.query(`ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_941289df174d4ece7998279a6cf\``);
        await queryRunner.query(`ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_5c57453edc10a775036dd2f2124\``);
        await queryRunner.query(`ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_62f98f348ef41cda3ea6c48c0f6\``);
        await queryRunner.query(`ALTER TABLE \`platform_report\` DROP FOREIGN KEY \`FK_c8f7b24ef3af410835123236a17\``);
        await queryRunner.query(`ALTER TABLE \`platform_report\` DROP FOREIGN KEY \`FK_6e0790be1cf874619fcf852d209\``);
        await queryRunner.query(`ALTER TABLE \`platform_report\` DROP FOREIGN KEY \`FK_68d8ad4e732fa1b102100497f2d\``);
        await queryRunner.query(`ALTER TABLE \`platform_report\` DROP FOREIGN KEY \`FK_bef087d503eb67c6d679ed1a5f7\``);
        await queryRunner.query(`DROP TABLE \`template\``);
        await queryRunner.query(`DROP TABLE \`platform_report\``);
    }

}
