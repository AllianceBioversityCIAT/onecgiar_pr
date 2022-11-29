import { MigrationInterface, QueryRunner } from 'typeorm';

export class deleteUserDuplicateTable1664458751730
  implements MigrationInterface
{
  name = 'deleteUserDuplicateTable1664458751730';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_02f995ed1a53ffadec91f1f1012\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_4d484f699c948239f5f13c635aa\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_c5265e6f64949ad5faeecec1490\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_d78027934f97fb1ddc1e79a87c1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_5ecc67bc0d3fdc650138d509d27\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_5feeeaa251795ec834bc6d8a72d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_a4bb5660ef58c4236560192df90\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_fb24d9cfa00e2e2ead619a61dd0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_141eb58a1a014a850a97ce518ef\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_470e3f625a6cd0a303591587628\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD \`created_by\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD \`last_updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD \`created_by\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD \`last_updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`created_by\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`last_updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`created_by\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`last_updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`createdById\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`createdById\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`last_updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_02f995ed1a53ffadec91f1f1012\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_4d484f699c948239f5f13c635aa\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_d78027934f97fb1ddc1e79a87c1\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_c5265e6f64949ad5faeecec1490\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_5feeeaa251795ec834bc6d8a72d\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_5ecc67bc0d3fdc650138d509d27\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_a4bb5660ef58c4236560192df90\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_fb24d9cfa00e2e2ead619a61dd0\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_470e3f625a6cd0a303591587628\` FOREIGN KEY (\`createdById\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_141eb58a1a014a850a97ce518ef\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS \`user\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_141eb58a1a014a850a97ce518ef\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_470e3f625a6cd0a303591587628\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_fb24d9cfa00e2e2ead619a61dd0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_a4bb5660ef58c4236560192df90\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_5ecc67bc0d3fdc650138d509d27\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_5feeeaa251795ec834bc6d8a72d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_c5265e6f64949ad5faeecec1490\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_d78027934f97fb1ddc1e79a87c1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_4d484f699c948239f5f13c635aa\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_02f995ed1a53ffadec91f1f1012\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`last_updated_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`createdById\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`createdById\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`last_updated_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`created_by\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`last_updated_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`created_by\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD \`last_updated_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD \`created_by\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD \`last_updated_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD \`created_by\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_470e3f625a6cd0a303591587628\` FOREIGN KEY (\`createdById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_141eb58a1a014a850a97ce518ef\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_fb24d9cfa00e2e2ead619a61dd0\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_a4bb5660ef58c4236560192df90\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_5feeeaa251795ec834bc6d8a72d\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_5ecc67bc0d3fdc650138d509d27\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_d78027934f97fb1ddc1e79a87c1\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_c5265e6f64949ad5faeecec1490\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_4d484f699c948239f5f13c635aa\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_02f995ed1a53ffadec91f1f1012\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
