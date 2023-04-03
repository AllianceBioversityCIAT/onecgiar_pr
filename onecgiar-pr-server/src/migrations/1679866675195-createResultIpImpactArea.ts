import { MigrationInterface, QueryRunner } from "typeorm";

export class createResultIpImpactArea1679866675195 implements MigrationInterface {
    name = 'createResultIpImpactArea1679866675195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_ip_impact_area_target\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_ip_eoi_outcome_id\` int NOT NULL AUTO_INCREMENT, \`result_by_innovation_package_id\` bigint NOT NULL, \`impact_area_indicator_id\` int NOT NULL, PRIMARY KEY (\`result_ip_eoi_outcome_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_ip_impact_area_target\` ADD CONSTRAINT \`FK_c4930001afac385aec8a699125d\` FOREIGN KEY (\`result_by_innovation_package_id\`) REFERENCES \`result_by_innovation_package\`(\`result_by_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_impact_area_target\` ADD CONSTRAINT \`FK_f3b76a091be56d0133ffe9b4984\` FOREIGN KEY (\`impact_area_indicator_id\`) REFERENCES \`clarisa_impact_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_impact_area_target\` ADD CONSTRAINT \`FK_bb83bcf794fd3564526e7876748\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_impact_area_target\` DROP FOREIGN KEY \`FK_bb83bcf794fd3564526e7876748\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_impact_area_target\` DROP FOREIGN KEY \`FK_f3b76a091be56d0133ffe9b4984\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_impact_area_target\` DROP FOREIGN KEY \`FK_c4930001afac385aec8a699125d\``);
        await queryRunner.query(`DROP TABLE \`result_ip_impact_area_target\``);
    }

}
