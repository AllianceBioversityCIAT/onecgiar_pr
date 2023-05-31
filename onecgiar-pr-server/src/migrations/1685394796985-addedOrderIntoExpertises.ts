import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedOrderIntoExpertises1685394796985
  implements MigrationInterface
{
  name = 'addedOrderIntoExpertises1685394796985';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`expertises\` ADD \`order\` int NULL`,
    );

    await queryRunner.query(
      `update expertises set \`order\` = 2 WHERE expertises_id = 1 `,
    );
    await queryRunner.query(
      `update expertises set \`order\` = 3 WHERE expertises_id = 2 `,
    );
    await queryRunner.query(
      `update expertises set \`order\` = 4 WHERE expertises_id = 3 `,
    );
    await queryRunner.query(
      `update expertises set \`order\` = 5 WHERE expertises_id = 4 `,
    );
    await queryRunner.query(
      `update expertises set \`order\` = 6 WHERE expertises_id = 5 `,
    );
    await queryRunner.query(
      `update expertises set \`order\` = 7 WHERE expertises_id = 6 `,
    );
    await queryRunner.query(
      `update expertises set \`order\` = 8 WHERE expertises_id = 7 `,
    );
    await queryRunner.query(
      `update expertises set \`order\` = 9 WHERE expertises_id = 8 `,
    );
    await queryRunner.query(
      `update expertises set \`order\` = 10 WHERE expertises_id = 9 `,
    );
    await queryRunner.query(
      `update expertises set \`order\` = 11 WHERE expertises_id = 10 `,
    );
    await queryRunner.query(
      `update expertises set \`order\` = 1 WHERE expertises_id = 11 `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`expertises\` DROP COLUMN \`order\``);
  }
}
