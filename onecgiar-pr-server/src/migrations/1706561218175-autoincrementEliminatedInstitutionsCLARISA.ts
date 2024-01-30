import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoincrementEliminatedInstitutionsCLARISA1706561218175
  implements MigrationInterface
{
  name = 'AutoincrementEliminatedInstitutionsCLARISA1706561218175';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET foreign_key_checks = 0;`);
    await queryRunner.query(
      `ALTER TABLE clarisa_institutions MODIFY COLUMN id INT;`,
    );
    await queryRunner.query(`SET foreign_key_checks = 1;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ASET foreign_key_checks = 0;`);

    await queryRunner.query(
      `ALTER TABLE clarisa_institutions MODIFY COLUMN id INT AUTO_INCREMENT;`,
    );
    await queryRunner.query(`SET foreign_key_checks = 1;`);
  }
}
