import { MigrationInterface, QueryRunner } from 'typeorm';

export class resultTypeRefactorv21664313260937 implements MigrationInterface {
  name = 'resultTypeRefactorv21664313260937';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_level\` CHANGE \`id\` \`id\` bigint NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`result_level\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`result_level\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`result_level\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_type\` ADD CONSTRAINT \`FK_4b1bdfa8d1881634acd0b2323ad\` FOREIGN KEY (\`result_level_id\`) REFERENCES \`result_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_type\` DROP FOREIGN KEY \`FK_4b1bdfa8d1881634acd0b2323ad\``,
    );
    await queryRunner.query(`ALTER TABLE \`result_level\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`result_level\` ADD \`id\` bigint NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_level\` ADD PRIMARY KEY (\`id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_level\` CHANGE \`id\` \`id\` bigint NOT NULL AUTO_INCREMENT`,
    );
  }
}
