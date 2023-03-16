import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultInnovationPackage1678979127831 implements MigrationInterface {
    name = 'refactorResultInnovationPackage1678979127831'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` CHANGE \`result_innovation_package_id\` \`result_innovation_package_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`result_innovation_package_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`result_innovation_package_id\` bigint NOT NULL PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD UNIQUE INDEX \`IDX_a6ad6adc3704fa9bf7e72354a5\` (\`result_innovation_package_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_a6ad6adc3704fa9bf7e72354a5\` ON \`result_innovation_package\` (\`result_innovation_package_id\`)`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_a6ad6adc3704fa9bf7e72354a56\` FOREIGN KEY (\`result_innovation_package_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_a6ad6adc3704fa9bf7e72354a56\``);
        await queryRunner.query(`DROP INDEX \`REL_a6ad6adc3704fa9bf7e72354a5\` ON \`result_innovation_package\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP INDEX \`IDX_a6ad6adc3704fa9bf7e72354a5\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`result_innovation_package_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`result_innovation_package_id\` bigint NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD PRIMARY KEY (\`result_innovation_package_id\`)`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` CHANGE \`result_innovation_package_id\` \`result_innovation_package_id\` bigint NOT NULL AUTO_INCREMENT`);
    }

}
