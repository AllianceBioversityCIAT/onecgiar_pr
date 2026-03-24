import { MigrationInterface, QueryRunner } from "typeorm";

export class IPSRPathwayFrameWork1764622104273 implements MigrationInterface {
    name = 'IPSRPathwayFrameWork1764622104273'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`has_scaling_studies\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` ADD \`result_innov_package_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` ADD CONSTRAINT \`FK_e4a2c2586f31217e49a50267972\` FOREIGN KEY (\`result_innov_package_id\`) REFERENCES \`result_innovation_package\`(\`result_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` DROP FOREIGN KEY \`FK_e4a2c2586f31217e49a50267972\``);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` DROP COLUMN \`result_innov_package_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`has_scaling_studies\``);
    }

}
