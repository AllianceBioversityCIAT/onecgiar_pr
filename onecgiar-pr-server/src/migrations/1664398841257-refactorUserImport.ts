import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorUserImport1664398841257 implements MigrationInterface {
  name = 'refactorUserImport1664398841257';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_c62881778cd9bcf0c78f954c300\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_fea91e52131de09b1c76ce144af\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`created_by\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`last_updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD CONSTRAINT \`FK_fea91e52131de09b1c76ce144af\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD CONSTRAINT \`FK_c62881778cd9bcf0c78f954c300\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_c62881778cd9bcf0c78f954c300\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_fea91e52131de09b1c76ce144af\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`last_updated_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`created_by\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD CONSTRAINT \`FK_fea91e52131de09b1c76ce144af\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD CONSTRAINT \`FK_c62881778cd9bcf0c78f954c300\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
