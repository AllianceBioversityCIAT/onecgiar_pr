import { MigrationInterface, QueryRunner } from 'typeorm';

export class deleteFkSharedResult1690302571639 implements MigrationInterface {
  name = 'deleteFkSharedResult1690302571639';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`share_result_request\` DROP FOREIGN KEY \`FK_aaa6305dc4708e5a4366dc8f002\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`share_result_request\` ADD CONSTRAINT \`FK_aaa6305dc4708e5a4366dc8f002\` FOREIGN KEY (\`toc_result_id\`) REFERENCES \`toc_result\`(\`toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
