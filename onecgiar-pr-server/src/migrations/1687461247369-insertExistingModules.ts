import { MigrationInterface, QueryRunner } from 'typeorm';

export class insertExistingModules1687461247369 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `insert into \`application_modules\` (name, created_date) values ('Reporting', '2022-12-01'), ('IPSR', '2023-06-08')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
