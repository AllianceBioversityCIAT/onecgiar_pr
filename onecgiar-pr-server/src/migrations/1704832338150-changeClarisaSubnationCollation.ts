import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeClarisaSubnationCollation1704832338150
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE result_country_subnational DROP FOREIGN KEY FK_1e1efef16a732f8bf6da8c48558;`,
    );
    await queryRunner.query(
      `ALTER TABLE result_country_subnational DROP FOREIGN KEY FK_9cd848b34ec56f5e74161e2c854;`,
    );
    await queryRunner.query(
      `ALTER TABLE clarisa_subnational_scopes CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci;`,
    );
    await queryRunner.query(
      `ALTER TABLE result_country_subnational CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci;`,
    );
    await queryRunner.query(
      `ALTER TABLE result_country_subnational ADD CONSTRAINT FK_1e1efef16a732f8bf6da8c48558 FOREIGN KEY (clarisa_subnational_scope_code) REFERENCES clarisa_subnational_scopes(code);`,
    );
    await queryRunner.query(
      `ALTER TABLE result_country_subnational ADD CONSTRAINT FK_9cd848b34ec56f5e74161e2c854 FOREIGN KEY (result_country_id) REFERENCES result_country(result_country_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE result_country_subnational DROP FOREIGN KEY FK_1e1efef16a732f8bf6da8c48558;`,
    );
    await queryRunner.query(
      `ALTER TABLE clarisa_subnational_scopes CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;`,
    );
    await queryRunner.query(
      `ALTER TABLE result_country_subnational CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;`,
    );
    await queryRunner.query(
      `ALTER TABLE result_country_subnational ADD CONSTRAINT FK_1e1efef16a732f8bf6da8c48558 FOREIGN KEY (clarisa_subnational_scope_code) REFERENCES clarisa_subnational_scopes(code);`,
    );
    await queryRunner.query(
      `ALTER TABLE result_country_subnational ADD CONSTRAINT FK_9cd848b34ec56f5e74161e2c854 FOREIGN KEY (result_country_id) REFERENCES result_country(result_country_id);`,
    );
  }
}
