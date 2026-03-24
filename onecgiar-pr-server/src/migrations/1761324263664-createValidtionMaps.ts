import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateValidtionMaps1761324263664 implements MigrationInterface {
  name = 'CreateValidtionMaps1761324263664';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`validation_maps\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`display_name\` varchar(255) NOT NULL, \`function_name\` varchar(255) NOT NULL, PRIMARY KEY (\`display_name\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`validation_maps\``);
  }
}
