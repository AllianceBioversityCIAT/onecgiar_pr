import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorResultByInstitutionsResultId1665510798474
  implements MigrationInterface
{
  name = 'refactorResultByInstitutionsResultId1665510798474';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` CHANGE \`results_id\` \`results_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`results_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`id\` bigint NOT NULL PRIMARY KEY AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`result_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_e4daec1a1c37f1253766bf704d3\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_e4daec1a1c37f1253766bf704d3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`result_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`results_id\` bigint NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD PRIMARY KEY (\`results_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` CHANGE \`results_id\` \`results_id\` bigint NOT NULL AUTO_INCREMENT`,
    );
  }
}
