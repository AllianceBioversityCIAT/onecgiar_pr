import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTocLevelInTrT1720110970767 implements MigrationInterface {
  name = 'AddTocLevelInTrT1720110970767';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` ADD \`toc_level_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` ADD CONSTRAINT \`FK_a380b3f69f29e7e35a596924503\` FOREIGN KEY (\`toc_level_id\`) REFERENCES \`toc_level\`(\`toc_level_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` DROP FOREIGN KEY \`FK_a380b3f69f29e7e35a596924503\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` DROP COLUMN \`toc_level_id\``,
    );
  }
}
