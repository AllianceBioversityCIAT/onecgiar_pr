import { MigrationInterface, QueryRunner } from "typeorm";

export class updatedResultIpImpactArea1679924845208 implements MigrationInterface {
    name = 'updatedResultIpImpactArea1679924845208'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_impact_area_target\` DROP FOREIGN KEY \`FK_f3b76a091be56d0133ffe9b4984\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_impact_area_target\` ADD CONSTRAINT \`FK_f3b76a091be56d0133ffe9b4984\` FOREIGN KEY (\`impact_area_indicator_id\`) REFERENCES \`clarisa_impact_area_indicator\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_impact_area_target\` DROP FOREIGN KEY \`FK_f3b76a091be56d0133ffe9b4984\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_impact_area_target\` ADD CONSTRAINT \`FK_f3b76a091be56d0133ffe9b4984\` FOREIGN KEY (\`impact_area_indicator_id\`) REFERENCES \`clarisa_impact_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
