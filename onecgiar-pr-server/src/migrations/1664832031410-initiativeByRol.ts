import { MigrationInterface, QueryRunner } from 'typeorm';

export class initiativeByRol1664832031410 implements MigrationInterface {
  name = 'initiativeByRol1664832031410';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`inititiativeIdId\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD PRIMARY KEY (\`result_id\`, \`inititiative_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` CHANGE \`gender_related\` \`gender_related\` tinyint NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_ba7a756928195866e7e845e9698\` FOREIGN KEY (\`inititiativeIdId\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_ba7a756928195866e7e845e9698\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` CHANGE \`gender_related\` \`gender_related\` tinyint NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD PRIMARY KEY (\`result_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`inititiativeIdId\``,
    );
  }
}
