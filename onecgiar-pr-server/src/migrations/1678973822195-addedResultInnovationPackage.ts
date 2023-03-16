import { MigrationInterface, QueryRunner } from "typeorm";

export class addedResultInnovationPackage1678973822195 implements MigrationInterface {
    name = 'addedResultInnovationPackage1678973822195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`active_backstopping\` (\`active_backstopping_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`active_backstopping_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`regional_integrated\` (\`regional_integrated_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`regional_integrated_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`consensus_initiative_work_package\` (\`consensus_initiative_work_package_id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`consensus_initiative_work_package_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`relevant_country\` (\`relevant_country_id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`relevant_country_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`regional_leadership\` (\`regional_leadership_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`regional_leadership_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_innovation_package\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_innovation_package_id\` bigint NOT NULL AUTO_INCREMENT, \`experts_is_diverse\` tinyint NULL, \`is_not_diverse_justification\` text NULL, \`consensus_initiative_work_package\` int NULL, \`relevant_country\` int NULL, \`regional_leadership\` bigint NULL, \`regional_integrated\` bigint NULL, \`active_backstopping\` bigint NULL, PRIMARY KEY (\`result_innovation_package_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_22a747838062f0a35487233932c\` FOREIGN KEY (\`consensus_initiative_work_package\`) REFERENCES \`consensus_initiative_work_package\`(\`consensus_initiative_work_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_cef672cee5108fd31a5e72ff047\` FOREIGN KEY (\`relevant_country\`) REFERENCES \`relevant_country\`(\`relevant_country_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_a96359e0dbd212a9262b04636bb\` FOREIGN KEY (\`regional_leadership\`) REFERENCES \`regional_leadership\`(\`regional_leadership_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_81dd4e762d7e813a8907494bb00\` FOREIGN KEY (\`regional_integrated\`) REFERENCES \`regional_integrated\`(\`regional_integrated_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_af35e1f28764a245686e207af22\` FOREIGN KEY (\`active_backstopping\`) REFERENCES \`active_backstopping\`(\`active_backstopping_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_f1de1facdda4959b91d9085a88b\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_f1de1facdda4959b91d9085a88b\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_af35e1f28764a245686e207af22\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_81dd4e762d7e813a8907494bb00\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_a96359e0dbd212a9262b04636bb\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_cef672cee5108fd31a5e72ff047\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_22a747838062f0a35487233932c\``);
        await queryRunner.query(`DROP TABLE \`result_innovation_package\``);
        await queryRunner.query(`DROP TABLE \`regional_leadership\``);
        await queryRunner.query(`DROP TABLE \`relevant_country\``);
        await queryRunner.query(`DROP TABLE \`consensus_initiative_work_package\``);
        await queryRunner.query(`DROP TABLE \`regional_integrated\``);
        await queryRunner.query(`DROP TABLE \`active_backstopping\``);
    }

}
