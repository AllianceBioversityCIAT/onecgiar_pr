import { MigrationInterface, QueryRunner } from "typeorm";

export class changeNameUpdatedCreated1663590094118 implements MigrationInterface {
    name = 'changeNameUpdatedCreated1663590094118'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`create_at\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`update_at\``);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` DROP COLUMN \`create_at\``);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` DROP COLUMN \`update_at\``);
        await queryRunner.query(`ALTER TABLE \`role\` DROP COLUMN \`create_at\``);
        await queryRunner.query(`ALTER TABLE \`role\` DROP COLUMN \`update_at\``);
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` DROP COLUMN \`create_at\``);
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` DROP COLUMN \`update_at\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`role\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`role\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`role\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`role\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` ADD \`update_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` ADD \`create_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`role\` ADD \`update_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`role\` ADD \`create_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` ADD \`update_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` ADD \`create_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`update_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`create_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
    }

}
