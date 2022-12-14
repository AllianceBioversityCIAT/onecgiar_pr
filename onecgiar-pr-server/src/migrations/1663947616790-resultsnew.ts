import { MigrationInterface, QueryRunner } from 'typeorm';

export class resultsnew1663947616790 implements MigrationInterface {
  name = 'resultsnew1663947616790';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_cdbae393c1c7603a7c19c574cb1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_ba7a756928195866e7e845e9698\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_73cf3e6ca5a84f6fb065860b4dd\``,
    );
    await queryRunner.query(
      `CREATE TABLE \`evidence_type\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`evidence\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`link\` varchar(100) NOT NULL, \`description\` text NULL, \`is_active\` tinyint NOT NULL, \`creation_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version_id\` bigint NOT NULL, \`created_by\` bigint NOT NULL, \`last_updated_by\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`initiative_role\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(45) NULL, \`description\` varchar(45) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`results_by_evidence\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL, \`creation_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`results_id\` bigint NOT NULL, \`evidences_id\` bigint NOT NULL, \`evidence_types_id\` bigint NOT NULL, \`version_id\` bigint NOT NULL, \`created_by\` bigint NOT NULL, \`last_updated_by\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`result_level_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`role\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`inititiativeIdId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_type\` ADD \`result_level_id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_type\` ADD \`resultLevelIdId\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`initiative_role_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`createdById\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`institution_types_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`gender_tag_level\` CHANGE \`title\` \`title\` varchar(45) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`gender_tag_level\` CHANGE \`description\` \`description\` varchar(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_level\` CHANGE \`name\` \`name\` varchar(45) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_level\` CHANGE \`description\` \`description\` varchar(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_type\` CHANGE \`name\` \`name\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_type\` CHANGE \`description\` \`description\` varchar(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` CHANGE \`first_name\` \`first_name\` varchar(200) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` CHANGE \`last_name\` \`last_name\` varchar(200) NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`email\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`email\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` CHANGE \`start_date\` \`start_date\` varchar(45) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` CHANGE \`end_date\` \`end_date\` varchar(45) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` CHANGE \`description\` \`description\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` CHANGE \`last_updated_date\` \`last_updated_date\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`institution_role\` CHANGE \`name\` \`name\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD PRIMARY KEY (\`result_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`created_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` CHANGE \`last_updated_date\` \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`created_by\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`last_updated_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`creation_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`creation_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`last_updated_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_type\` ADD CONSTRAINT \`FK_233cb9e7b135101e29167e03e44\` FOREIGN KEY (\`resultLevelIdId\`) REFERENCES \`result_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_10e4a92a8dcdf201c59cd37fa7d\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_02f995ed1a53ffadec91f1f1012\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_4d484f699c948239f5f13c635aa\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_4e113ec11bf1911212375ec5e9f\` FOREIGN KEY (\`initiative_role_id\`) REFERENCES \`initiative_role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_6478fe906b706712fc9782bf27b\` FOREIGN KEY (\`results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_685fa898bda7d5f0e3078c702a3\` FOREIGN KEY (\`evidences_id\`) REFERENCES \`evidence\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_bbd96dc95ae93743a0995c37df6\` FOREIGN KEY (\`evidence_types_id\`) REFERENCES \`evidence_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_ed32ac35727cd95c9f5dfb2b5d5\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_d78027934f97fb1ddc1e79a87c1\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_c5265e6f64949ad5faeecec1490\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_470e3f625a6cd0a303591587628\` FOREIGN KEY (\`createdById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_470e3f625a6cd0a303591587628\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_c5265e6f64949ad5faeecec1490\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_d78027934f97fb1ddc1e79a87c1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_ed32ac35727cd95c9f5dfb2b5d5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_bbd96dc95ae93743a0995c37df6\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_685fa898bda7d5f0e3078c702a3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_6478fe906b706712fc9782bf27b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_4e113ec11bf1911212375ec5e9f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_4d484f699c948239f5f13c635aa\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_02f995ed1a53ffadec91f1f1012\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_10e4a92a8dcdf201c59cd37fa7d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_type\` DROP FOREIGN KEY \`FK_233cb9e7b135101e29167e03e44\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`last_updated_date\` timestamp(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`creation_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`creation_date\` timestamp(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`last_updated_date\` timestamp(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`created_by\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` CHANGE \`last_updated_date\` \`last_updated_date\` timestamp(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`created_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`created_date\` timestamp(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD PRIMARY KEY (\`result_id\`, \`inititiative_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`institution_role\` CHANGE \`name\` \`name\` varchar(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` CHANGE \`last_updated_date\` \`last_updated_date\` timestamp NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` CHANGE \`description\` \`description\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` CHANGE \`end_date\` \`end_date\` varchar(45) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` CHANGE \`start_date\` \`start_date\` varchar(45) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`email\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`email\` varchar(500) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` CHANGE \`last_name\` \`last_name\` varchar(200) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` CHANGE \`first_name\` \`first_name\` varchar(200) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_type\` CHANGE \`description\` \`description\` varchar(500) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_type\` CHANGE \`name\` \`name\` varchar(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_level\` CHANGE \`description\` \`description\` varchar(500) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_level\` CHANGE \`name\` \`name\` varchar(45) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`gender_tag_level\` CHANGE \`description\` \`description\` varchar(500) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`gender_tag_level\` CHANGE \`title\` \`title\` varchar(45) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`institution_types_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`createdById\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`initiative_role_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_type\` DROP COLUMN \`resultLevelIdId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_type\` DROP COLUMN \`result_level_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`inititiativeIdId\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`role\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`result_level_id\` bigint NULL`,
    );
    await queryRunner.query(`DROP TABLE \`results_by_evidence\``);
    await queryRunner.query(`DROP TABLE \`initiative_role\``);
    await queryRunner.query(`DROP TABLE \`evidence\``);
    await queryRunner.query(`DROP TABLE \`evidence_type\``);
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_73cf3e6ca5a84f6fb065860b4dd\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_ba7a756928195866e7e845e9698\` FOREIGN KEY (\`inititiativeIdId\`) REFERENCES \`inititiative\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD CONSTRAINT \`FK_cdbae393c1c7603a7c19c574cb1\` FOREIGN KEY (\`result_level_id\`) REFERENCES \`result_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
