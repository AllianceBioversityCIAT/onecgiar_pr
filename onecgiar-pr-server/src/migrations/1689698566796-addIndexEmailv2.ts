import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIndexEmailv21689698566796 implements MigrationInterface {
  name = 'addIndexEmailv21689698566796';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`email\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`email\` varchar(150) NULL`,
    );
    await queryRunner.query(`update \`users\` set email = temp_email`);
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`email\` varchar(150) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`)`,
    );
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`temp_email\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\``,
    );
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`email\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`email\` text COLLATE "utf8_unicode_ci" NOT NULL`,
    );
  }
}
