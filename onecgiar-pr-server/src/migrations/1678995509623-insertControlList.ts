import { MigrationInterface, QueryRunner } from "typeorm";

export class insertControlList1678995509623 implements MigrationInterface {
    name = 'insertControlList1678995509623'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_a6ad6adc3704fa9bf7e72354a5\` ON \`result_innovation_package\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_22a747838062f0a35487233932c\``);
        await queryRunner.query(`ALTER TABLE \`consensus_initiative_work_package\` CHANGE \`consensus_initiative_work_package_id\` \`consensus_initiative_work_package_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`consensus_initiative_work_package\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`consensus_initiative_work_package\` DROP COLUMN \`consensus_initiative_work_package_id\``);
        await queryRunner.query(`ALTER TABLE \`consensus_initiative_work_package\` ADD \`consensus_initiative_work_package_id\` bigint NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_cef672cee5108fd31a5e72ff047\``);
        await queryRunner.query(`ALTER TABLE \`relevant_country\` CHANGE \`relevant_country_id\` \`relevant_country_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`relevant_country\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`relevant_country\` DROP COLUMN \`relevant_country_id\``);
        await queryRunner.query(`ALTER TABLE \`relevant_country\` ADD \`relevant_country_id\` bigint NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`consensus_initiative_work_package\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`consensus_initiative_work_package\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`relevant_country\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`relevant_country\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_22a747838062f0a35487233932c\` FOREIGN KEY (\`consensus_initiative_work_package\`) REFERENCES \`consensus_initiative_work_package\`(\`consensus_initiative_work_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_cef672cee5108fd31a5e72ff047\` FOREIGN KEY (\`relevant_country\`) REFERENCES \`relevant_country\`(\`relevant_country_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        
        await queryRunner.query(`INSERT INTO consensus_initiative_work_package (name) VALUES ('Yes, there is consensus'), ('Not yet consensus');`);
        await queryRunner.query(`INSERT INTO relevant_country (name) VALUES ('Yes, the CGIAR country convener is aware'), ('No, the CGIAR country convener is not yet aware'), ('Not applicable');`);
        await queryRunner.query(`INSERT INTO regional_leadership (name) VALUES ('Yes, the CGIAR Regional Leadership is aware'), ('No, the CGIAR Regional Leadership is not yet aware'), ('Not applicable');`);
        await queryRunner.query(`INSERT INTO regional_integrated (name) VALUES ('Yes, the CGIAR Regional Integrated Initiative leadership is aware'), ('No, the CGIAR Regional Integrated Initiative leadership is not yet aware'), ('Not applicable');`);
        await queryRunner.query(`INSERT INTO active_backstopping (name) VALUES ('Yes, put me in touch with an expert'), ('No'), ('Not applicable');`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_cef672cee5108fd31a5e72ff047\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_22a747838062f0a35487233932c\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`relevant_country\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`relevant_country\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`consensus_initiative_work_package\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`consensus_initiative_work_package\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`relevant_country\` DROP COLUMN \`relevant_country_id\``);
        await queryRunner.query(`ALTER TABLE \`relevant_country\` ADD \`relevant_country_id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`relevant_country\` ADD PRIMARY KEY (\`relevant_country_id\`)`);
        await queryRunner.query(`ALTER TABLE \`relevant_country\` CHANGE \`relevant_country_id\` \`relevant_country_id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_cef672cee5108fd31a5e72ff047\` FOREIGN KEY (\`relevant_country\`) REFERENCES \`relevant_country\`(\`relevant_country_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`consensus_initiative_work_package\` DROP COLUMN \`consensus_initiative_work_package_id\``);
        await queryRunner.query(`ALTER TABLE \`consensus_initiative_work_package\` ADD \`consensus_initiative_work_package_id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`consensus_initiative_work_package\` ADD PRIMARY KEY (\`consensus_initiative_work_package_id\`)`);
        await queryRunner.query(`ALTER TABLE \`consensus_initiative_work_package\` CHANGE \`consensus_initiative_work_package_id\` \`consensus_initiative_work_package_id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_22a747838062f0a35487233932c\` FOREIGN KEY (\`consensus_initiative_work_package\`) REFERENCES \`consensus_initiative_work_package\`(\`consensus_initiative_work_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_a6ad6adc3704fa9bf7e72354a5\` ON \`result_innovation_package\` (\`result_innovation_package_id\`)`);
    }

}
