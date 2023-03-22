import { MigrationInterface, QueryRunner } from "typeorm";

export class createResultByInnovationPackage1679497305930 implements MigrationInterface {
    name = 'createResultByInnovationPackage1679497305930'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_by_innovation_package\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_by_innovation_package_id\` bigint NOT NULL AUTO_INCREMENT, \`result_innovation_package_id\` bigint NOT NULL, \`result_id\` bigint NOT NULL, \`ipsr_role_id\` bigint NOT NULL, PRIMARY KEY (\`result_by_innovation_package_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_4cf023c35208a2e4ed3e1fd6c08\` FOREIGN KEY (\`ipsr_role_id\`) REFERENCES \`ipsr_role\`(\`ipsr_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_e316887d99495a701e7f68d30f3\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_8c77fb18dbfa9d7e3cd9ba17a5f\` FOREIGN KEY (\`result_innovation_package_id\`) REFERENCES \`result_innovation_package\`(\`result_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_66c48c6d7d76d10925975d61708\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_66c48c6d7d76d10925975d61708\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_8c77fb18dbfa9d7e3cd9ba17a5f\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_e316887d99495a701e7f68d30f3\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_4cf023c35208a2e4ed3e1fd6c08\``);
        await queryRunner.query(`DROP TABLE \`result_by_innovation_package\``);
    }

}
