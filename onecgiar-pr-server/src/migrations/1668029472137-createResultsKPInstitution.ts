import { MigrationInterface, QueryRunner } from 'typeorm';

export class createResultsKPInstitution1668029472137
  implements MigrationInterface
{
  name = 'createResultsKPInstitution1668029472137';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`results_kp_mqap_institutions\` (\`result_kp_mqap_institution_id\` bigint NOT NULL AUTO_INCREMENT, \`intitution_name\` text NULL, \`confidant\` float NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`result_knowledge_product_id\` bigint NULL, \`predicted_institution_id\` int NULL, \`results_by_institutions_id\` bigint NULL, \`version_id\` bigint NOT NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`result_kp_mqap_institution_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_d887f9f657c757413a43c4e491d\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_8f04d42ecd221d17c6ae827d1e0\` FOREIGN KEY (\`predicted_institution_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_4b90ac3eff7c8506a362680a0e4\` FOREIGN KEY (\`results_by_institutions_id\`) REFERENCES \`results_by_institution\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_3816658291ea652e70e301db1be\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_27a338276b4fd117fc33dfc16f9\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_ab7c7dd4e7160edc0ed177eb283\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_ab7c7dd4e7160edc0ed177eb283\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_27a338276b4fd117fc33dfc16f9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_3816658291ea652e70e301db1be\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_4b90ac3eff7c8506a362680a0e4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_8f04d42ecd221d17c6ae827d1e0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_d887f9f657c757413a43c4e491d\``,
    );
    await queryRunner.query(`DROP TABLE \`results_kp_mqap_institutions\``);
  }
}
