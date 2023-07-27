import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTableBymigrations1690486693821 implements MigrationInterface {
    name = 'AlterTableBymigrations1690486693821'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` DROP FOREIGN KEY \`FK_9f2390943480c54bff0c0a3b7e1\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` CHANGE \`status\` \`status\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` ADD CONSTRAINT \`FK_6b6d928542c50b8e85839d968c9\` FOREIGN KEY (\`results_toc_results_id\`) REFERENCES \`results_toc_result\`(\`result_toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` DROP FOREIGN KEY \`FK_6b6d928542c50b8e85839d968c9\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` CHANGE \`status\` \`status\` bigint NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` ADD CONSTRAINT \`FK_9f2390943480c54bff0c0a3b7e1\` FOREIGN KEY (\`results_toc_results_id\`) REFERENCES \`results_toc_result\`(\`result_toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
