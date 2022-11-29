import { MigrationInterface, QueryRunner } from 'typeorm';

export class auditableColumnsUsers1663362784548 implements MigrationInterface {
  name = 'auditableColumnsUsers1663362784548';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`role\` ADD \`create_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` ADD \`update_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` ADD \`update_by\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` ADD \`create_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` ADD \`update_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` ADD \`update_by\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`create_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`update_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`update_by\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`complementary_data_users\` ADD \`create_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`complementary_data_users\` ADD \`update_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`complementary_data_users\` ADD \`update_by\` int NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`complementary_data_users\` DROP COLUMN \`update_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`complementary_data_users\` DROP COLUMN \`update_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`complementary_data_users\` DROP COLUMN \`create_at\``,
    );
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`update_by\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`update_at\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`create_at\``);
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` DROP COLUMN \`update_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` DROP COLUMN \`update_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` DROP COLUMN \`create_at\``,
    );
    await queryRunner.query(`ALTER TABLE \`role\` DROP COLUMN \`update_by\``);
    await queryRunner.query(`ALTER TABLE \`role\` DROP COLUMN \`update_at\``);
    await queryRunner.query(`ALTER TABLE \`role\` DROP COLUMN \`create_at\``);
  }
}
