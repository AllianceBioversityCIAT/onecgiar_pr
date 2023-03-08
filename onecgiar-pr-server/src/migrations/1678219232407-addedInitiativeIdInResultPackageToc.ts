import { MigrationInterface, QueryRunner } from "typeorm";

export class addedInitiativeIdInResultPackageToc1678219232407 implements MigrationInterface {
    name = 'addedInitiativeIdInResultPackageToc1678219232407'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` ADD \`initiative_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` DROP FOREIGN KEY \`FK_f41ff6ec294e044f2c2fa84635d\``);
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` CHANGE \`toc_result_id\` \`toc_result_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` CHANGE \`planned_result_packages\` \`planned_result_packages\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` ADD CONSTRAINT \`FK_1c95e7ed3a300d54c3bacc18993\` FOREIGN KEY (\`initiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` ADD CONSTRAINT \`FK_f41ff6ec294e044f2c2fa84635d\` FOREIGN KEY (\`toc_result_id\`) REFERENCES \`toc_result\`(\`toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` DROP FOREIGN KEY \`FK_f41ff6ec294e044f2c2fa84635d\``);
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` DROP FOREIGN KEY \`FK_1c95e7ed3a300d54c3bacc18993\``);
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` CHANGE \`planned_result_packages\` \`planned_result_packages\` tinyint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` CHANGE \`toc_result_id\` \`toc_result_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` ADD CONSTRAINT \`FK_f41ff6ec294e044f2c2fa84635d\` FOREIGN KEY (\`toc_result_id\`) REFERENCES \`toc_result\`(\`toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovation_package_toc_result\` DROP COLUMN \`initiative_id\``);
    }

}
