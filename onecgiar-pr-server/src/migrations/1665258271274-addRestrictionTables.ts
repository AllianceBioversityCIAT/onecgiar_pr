import { MigrationInterface, QueryRunner } from 'typeorm';

export class addRestrictionTables1665258271274 implements MigrationInterface {
  name = 'addRestrictionTables1665258271274';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`restriction\` (\`id\` int NOT NULL AUTO_INCREMENT, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`restrictions_by_role\` (\`id\` int NOT NULL AUTO_INCREMENT, \`active\` tinyint NOT NULL DEFAULT 1, \`role_id\` int NOT NULL, \`restriction_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`restrictions_by_role\` ADD CONSTRAINT \`FK_2fad687c25a916ef28431411624\` FOREIGN KEY (\`role_id\`) REFERENCES \`role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`restrictions_by_role\` ADD CONSTRAINT \`FK_112a2145f1021460618a85f0aef\` FOREIGN KEY (\`restriction_id\`) REFERENCES \`restriction\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`restrictions_by_role\` DROP FOREIGN KEY \`FK_112a2145f1021460618a85f0aef\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`restrictions_by_role\` DROP FOREIGN KEY \`FK_2fad687c25a916ef28431411624\``,
    );
    await queryRunner.query(`DROP TABLE \`restrictions_by_role\``);
    await queryRunner.query(`DROP TABLE \`restriction\``);
  }
}
