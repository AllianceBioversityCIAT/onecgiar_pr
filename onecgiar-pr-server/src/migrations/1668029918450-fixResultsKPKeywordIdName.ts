import { MigrationInterface, QueryRunner } from "typeorm";

export class fixResultsKPKeywordIdName1668029918450 implements MigrationInterface {
    name = 'fixResultsKPKeywordIdName1668029918450'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` CHANGE \`result_kp_metadata_id\` \`result_kp_keyword_id\` bigint NOT NULL AUTO_INCREMENT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` CHANGE \`result_kp_keyword_id\` \`result_kp_metadata_id\` bigint NOT NULL AUTO_INCREMENT`);
    }

}
