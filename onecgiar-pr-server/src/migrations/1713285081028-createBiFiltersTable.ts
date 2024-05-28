import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBiFiltersTable1713285081028 implements MigrationInterface {
  name = 'CreateBiFiltersTable1713285081028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`bi_filters\` (\`id\` int NOT NULL AUTO_INCREMENT, \`variablename\` text NOT NULL, \`scope\` text NOT NULL, \`table\` text NOT NULL, \`column\` text NOT NULL, \`operator\` text NOT NULL, \`param_type\` text NOT NULL, \`report_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_reports\` CHANGE \`report_name\` \`report_name\` varchar(30) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_reports\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`bi_reports\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`bi_reports\` ADD PRIMARY KEY (\`id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_reports\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_filters\` ADD CONSTRAINT \`FK_274d842ef29f146246c861749ba\` FOREIGN KEY (\`report_id\`) REFERENCES \`bi_reports\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bi_filters\` DROP FOREIGN KEY \`FK_274d842ef29f146246c861749ba\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_reports\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`bi_reports\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`bi_reports\` ADD PRIMARY KEY (\`id\`, \`report_name\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_reports\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_reports\` CHANGE \`report_name\` \`report_name\` varchar(30) COLLATE "utf8mb3_unicode_ci" NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE \`bi_filters\``);
  }
}
