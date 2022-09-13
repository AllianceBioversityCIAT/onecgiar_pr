import { MigrationInterface, QueryRunner } from 'typeorm';

export class TestMigration1662999384662 implements MigrationInterface {
  name = 'TestMigration1662999384662';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` DROP FOREIGN KEY \`FK_07aa3bde74ce010f1736462e505\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` CHANGE \`roleId\` \`role_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` ADD CONSTRAINT \`FK_ec2c2fa3c9e3e0f75dc61f84def\` FOREIGN KEY (\`role_id\`) REFERENCES \`role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` DROP FOREIGN KEY \`FK_ec2c2fa3c9e3e0f75dc61f84def\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` CHANGE \`role_id\` \`roleId\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` ADD CONSTRAINT \`FK_07aa3bde74ce010f1736462e505\` FOREIGN KEY (\`roleId\`) REFERENCES \`role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
