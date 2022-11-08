import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorUserEntity1664296868705 implements MigrationInterface {
  name = 'refactorUserEntity1664296868705';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`created_at\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`updated_at\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`updated_by\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) AFTER \`active\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`last_updated_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) AFTER \`created_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`created_by\` int NULL AFTER \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`last_updated_by\` int NULL AFTER \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_f32b1cb14a9920477bcfd63df2c\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_af87ddcc787d5d988d19fc8b175\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_af87ddcc787d5d988d19fc8b175\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_f32b1cb14a9920477bcfd63df2c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`created_by\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`created_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
  }
}
