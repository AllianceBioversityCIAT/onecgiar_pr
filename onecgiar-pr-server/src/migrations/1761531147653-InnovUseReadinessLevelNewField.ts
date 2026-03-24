import { MigrationInterface, QueryRunner } from "typeorm";

export class InnovUseReadinessLevelNewField1761531147653 implements MigrationInterface {
    name = 'InnovUseReadinessLevelNewField1761531147653'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD \`innovation_readiness_level_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD CONSTRAINT \`FK_ec5a8dbb5d0e02ed352fd445b29\` FOREIGN KEY (\`innovation_readiness_level_id\`) REFERENCES \`clarisa_innovation_readiness_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP FOREIGN KEY \`FK_ec5a8dbb5d0e02ed352fd445b29\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP COLUMN \`innovation_readiness_level_id\``);
    }

}
