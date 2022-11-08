import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorUserEntity1664297620508 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`password\` text NULL AFTER \`email\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`last_login\` timestamp NULL AFTER \`password\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`created_by\` int NULL AFTER \`created_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`last_updated_by\` int NULL AFTER \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`last_updated_by\` int NULL AFTER \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`is_cgiar\` tinyint NULL AFTER \`email\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
