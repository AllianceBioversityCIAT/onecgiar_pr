import { MigrationInterface, QueryRunner } from "typeorm";

export class updatedRelationIpsrEnablerType1685108991225 implements MigrationInterface {
    name = 'updatedRelationIpsrEnablerType1685108991225'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovatio_packages_enabler_type\` DROP FOREIGN KEY \`FK_1660c4e5f73bde3ea8b36157010\``);
        await queryRunner.query(`ALTER TABLE \`results_innovatio_packages_enabler_type\` ADD CONSTRAINT \`FK_1660c4e5f73bde3ea8b36157010\` FOREIGN KEY (\`result_by_innovation_package_id\`) REFERENCES \`result_by_innovation_package\`(\`result_by_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovatio_packages_enabler_type\` DROP FOREIGN KEY \`FK_1660c4e5f73bde3ea8b36157010\``);
        await queryRunner.query(`ALTER TABLE \`results_innovatio_packages_enabler_type\` ADD CONSTRAINT \`FK_1660c4e5f73bde3ea8b36157010\` FOREIGN KEY (\`result_by_innovation_package_id\`) REFERENCES \`result_innovation_package\`(\`result_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
