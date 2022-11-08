import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorClarisacountries1663864735934
  implements MigrationInterface
{
  name = 'refactorClarisacountries1663864735934';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries_regions\` DROP FOREIGN KEY \`FK_1aa06ba82f6e1560f3a909dcb6e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` DROP COLUMN \`id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries_regions\` ADD CONSTRAINT \`FK_1aa06ba82f6e1560f3a909dcb6e\` FOREIGN KEY (\`country_id\`) REFERENCES \`clarisa_countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries_regions\` DROP FOREIGN KEY \`FK_1aa06ba82f6e1560f3a909dcb6e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` DROP COLUMN \`id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` ADD \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` ADD PRIMARY KEY (\`id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries_regions\` ADD CONSTRAINT \`FK_1aa06ba82f6e1560f3a909dcb6e\` FOREIGN KEY (\`country_id\`) REFERENCES \`clarisa_countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
