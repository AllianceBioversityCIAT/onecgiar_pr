import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultsPolicyChanges1668824366896 implements MigrationInterface {
    name = 'refactorResultsPolicyChanges1668824366896'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD \`policy_stage_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD \`policy_type_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD CONSTRAINT \`FK_1e3c7cd27c3d352d3d68039df25\` FOREIGN KEY (\`policy_stage_id\`) REFERENCES \`clarisa_policy_stage\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD CONSTRAINT \`FK_819927355a43896043b4b313eaa\` FOREIGN KEY (\`policy_type_id\`) REFERENCES \`clarisa_policy_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP FOREIGN KEY \`FK_819927355a43896043b4b313eaa\``);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP FOREIGN KEY \`FK_1e3c7cd27c3d352d3d68039df25\``);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP COLUMN \`policy_type_id\``);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP COLUMN \`policy_stage_id\``);
    }

}