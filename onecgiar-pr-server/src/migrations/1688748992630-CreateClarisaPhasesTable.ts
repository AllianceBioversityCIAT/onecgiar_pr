import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClarisaPhasesTable1688748992630
  implements MigrationInterface
{
  name = 'CreateClarisaPhasesTable1688748992630';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`clarisa_toc_phase\` (\`phase_id\` varchar(50) NOT NULL, \`name\` text NOT NULL, \`year\` year NOT NULL, \`status\` text NOT NULL, \`active\` tinyint NOT NULL, PRIMARY KEY (\`phase_id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`clarisa_toc_phase\``);
  }
}
