import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultInnovationPackage1681313110912 implements MigrationInterface {
    name = 'refactorResultInnovationPackage1681313110912'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_22a747838062f0a35487233932c\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_81dd4e762d7e813a8907494bb00\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_a96359e0dbd212a9262b04636bb\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_af35e1f28764a245686e207af22\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_cef672cee5108fd31a5e72ff047\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`active_backstopping\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`consensus_initiative_work_package\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`regional_integrated\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`regional_leadership\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`relevant_country\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`consensus_initiative_work_package_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`relevant_country_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`regional_leadership_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`regional_integrated_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`active_backstopping_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_7480c66a528200ab9d0b5097a5d\` FOREIGN KEY (\`consensus_initiative_work_package_id\`) REFERENCES \`consensus_initiative_work_package\`(\`consensus_initiative_work_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_f88a9956b3bbc293480ab51f6e8\` FOREIGN KEY (\`relevant_country_id\`) REFERENCES \`relevant_country\`(\`relevant_country_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_9bfb8ba56d42a71e0f88edb5c5c\` FOREIGN KEY (\`regional_leadership_id\`) REFERENCES \`regional_leadership\`(\`regional_leadership_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_22079fd29dbaa2fee48f65a6954\` FOREIGN KEY (\`regional_integrated_id\`) REFERENCES \`regional_integrated\`(\`regional_integrated_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_1eb47c3bec1744bd049c896135b\` FOREIGN KEY (\`active_backstopping_id\`) REFERENCES \`active_backstopping\`(\`active_backstopping_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_1eb47c3bec1744bd049c896135b\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_22079fd29dbaa2fee48f65a6954\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_9bfb8ba56d42a71e0f88edb5c5c\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_f88a9956b3bbc293480ab51f6e8\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_7480c66a528200ab9d0b5097a5d\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`active_backstopping_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`regional_integrated_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`regional_leadership_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`relevant_country_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`consensus_initiative_work_package_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`relevant_country\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`regional_leadership\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`regional_integrated\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`consensus_initiative_work_package\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`active_backstopping\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_cef672cee5108fd31a5e72ff047\` FOREIGN KEY (\`relevant_country\`) REFERENCES \`relevant_country\`(\`relevant_country_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_af35e1f28764a245686e207af22\` FOREIGN KEY (\`active_backstopping\`) REFERENCES \`active_backstopping\`(\`active_backstopping_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_a96359e0dbd212a9262b04636bb\` FOREIGN KEY (\`regional_leadership\`) REFERENCES \`regional_leadership\`(\`regional_leadership_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_81dd4e762d7e813a8907494bb00\` FOREIGN KEY (\`regional_integrated\`) REFERENCES \`regional_integrated\`(\`regional_integrated_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_22a747838062f0a35487233932c\` FOREIGN KEY (\`consensus_initiative_work_package\`) REFERENCES \`consensus_initiative_work_package\`(\`consensus_initiative_work_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
