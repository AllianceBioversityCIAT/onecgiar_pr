import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorRolesDataModel1664292750630 implements MigrationInterface {
    name = 'refactorRolesDataModel1664292750630'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`role_levels\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`role_by_user\` (\`id\` int NOT NULL AUTO_INCREMENT, \`active\` tinyint NOT NULL DEFAULT 1, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`role\` int NULL, \`initiative_id\` int NULL, \`action_area_id\` int NULL, \`user\` int NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`role\` DROP COLUMN \`scope\``);
        await queryRunner.query(`ALTER TABLE \`role\` DROP COLUMN \`scope_id\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`is_cgiar\` tinyint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`password\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`last_login\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`role\` ADD \`role_level_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`role\` ADD CONSTRAINT \`FK_234be21e09419d8126666153c75\` FOREIGN KEY (\`role_level_id\`) REFERENCES \`role_levels\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` ADD CONSTRAINT \`FK_b2d61a3db03e6252504b4352196\` FOREIGN KEY (\`role\`) REFERENCES \`role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` ADD CONSTRAINT \`FK_ca5497966da117b34adf753cc52\` FOREIGN KEY (\`initiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` ADD CONSTRAINT \`FK_ca74c9f49bc68bbcf30f12607a8\` FOREIGN KEY (\`action_area_id\`) REFERENCES \`clarisa_action_area\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` ADD CONSTRAINT \`FK_a69c3f014f850c3d0291b6aa7a5\` FOREIGN KEY (\`user\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` ADD CONSTRAINT \`FK_8f73e4003e4e30cc916f3005587\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` ADD CONSTRAINT \`FK_cb5bd6c8dbab91e4af519718d5c\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`role_by_user\` DROP FOREIGN KEY \`FK_cb5bd6c8dbab91e4af519718d5c\``);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` DROP FOREIGN KEY \`FK_8f73e4003e4e30cc916f3005587\``);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` DROP FOREIGN KEY \`FK_a69c3f014f850c3d0291b6aa7a5\``);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` DROP FOREIGN KEY \`FK_ca74c9f49bc68bbcf30f12607a8\``);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` DROP FOREIGN KEY \`FK_ca5497966da117b34adf753cc52\``);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` DROP FOREIGN KEY \`FK_b2d61a3db03e6252504b4352196\``);
        await queryRunner.query(`ALTER TABLE \`role\` DROP FOREIGN KEY \`FK_234be21e09419d8126666153c75\``);
        await queryRunner.query(`ALTER TABLE \`role\` DROP COLUMN \`role_level_id\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`last_login\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`password\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`is_cgiar\``);
        await queryRunner.query(`ALTER TABLE \`role\` ADD \`scope_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`role\` ADD \`scope\` text NOT NULL`);
        await queryRunner.query(`DROP TABLE \`role_by_user\``);
        await queryRunner.query(`DROP TABLE \`role_levels\``);
    }

}
