import { MigrationInterface, QueryRunner } from 'typeorm';

export class EntityTypeColumnWasCreated1708546419559
  implements MigrationInterface
{
  name = 'EntityTypeColumnWasCreated1708546419559';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`clarisa_cgiar_entity_types\` (\`code\` bigint NOT NULL, \`name\` text NOT NULL, PRIMARY KEY (\`code\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_initiatives\` ADD \`cgiar_entity_type_id\` bigint NULL`,
    );
    await queryRunner.query(`SET foreign_key_checks = 0;`);
    await queryRunner.query(
      `ALTER TABLE \`clarisa_initiatives\` MODIFY COLUMN id INT NOT NULL;`,
    );
    await queryRunner.query(`SET foreign_key_checks = 1;`);
    await queryRunner.query(
      `ALTER TABLE \`clarisa_initiatives\` ADD CONSTRAINT \`FK_70dcc8679c05a636af603d66878\` FOREIGN KEY (\`cgiar_entity_type_id\`) REFERENCES \`clarisa_cgiar_entity_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_initiatives\` DROP FOREIGN KEY \`FK_70dcc8679c05a636af603d66878\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_initiatives\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_initiatives\` DROP COLUMN \`cgiar_entity_type_id\``,
    );
    await queryRunner.query(`DROP TABLE \`clarisa_cgiar_entity_types\``);
  }
}
