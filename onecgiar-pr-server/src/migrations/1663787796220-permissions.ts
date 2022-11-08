import { MigrationInterface, QueryRunner } from 'typeorm';

export class permissions1663787796220 implements MigrationInterface {
  name = 'permissions1663787796220';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`action\` (\`id\` int NOT NULL AUTO_INCREMENT, \`description\` text NOT NULL, \`active\` tinyint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`permission_by_role\` (\`id\` int NOT NULL AUTO_INCREMENT, \`active\` tinyint NOT NULL, \`role_id\` int NULL, \`action_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`permission_by_role\` ADD CONSTRAINT \`FK_372768e27cd94861eec3031cb6c\` FOREIGN KEY (\`role_id\`) REFERENCES \`role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`permission_by_role\` ADD CONSTRAINT \`FK_326972b1bc3445ec11fcca8f573\` FOREIGN KEY (\`action_id\`) REFERENCES \`action\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`permission_by_role\` DROP FOREIGN KEY \`FK_326972b1bc3445ec11fcca8f573\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`permission_by_role\` DROP FOREIGN KEY \`FK_372768e27cd94861eec3031cb6c\``,
    );
    await queryRunner.query(`DROP TABLE \`permission_by_role\``);
    await queryRunner.query(`DROP TABLE \`action\``);
  }
}
