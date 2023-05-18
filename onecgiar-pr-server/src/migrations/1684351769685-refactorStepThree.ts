import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorStepThree1684351769685 implements MigrationInterface {
    name = 'refactorStepThree1684351769685'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`assessed_during_expert_workshop\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`assessed_during_expert_workshop_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`current_innovation_readiness_level\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`current_innovation_use_level\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`potential_innovation_readiness_level\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`potential_innovation_use_level\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_5b9e831ba00617f08e70c54405d\` FOREIGN KEY (\`assessed_during_expert_workshop_id\`) REFERENCES \`assessed_during_expert_workshop\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_eeb1687179797c7b0eeb8ae5856\` FOREIGN KEY (\`current_innovation_readiness_level\`) REFERENCES \`clarisa_innovation_readiness_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_6ae29fc53fa1527245696ca0f0b\` FOREIGN KEY (\`current_innovation_use_level\`) REFERENCES \`clarisa_innovation_use_levels\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_b6509f9f0f5f649e96b11d729d0\` FOREIGN KEY (\`potential_innovation_readiness_level\`) REFERENCES \`clarisa_innovation_readiness_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_bf56dccd962526d11fbddcff926\` FOREIGN KEY (\`potential_innovation_use_level\`) REFERENCES \`clarisa_innovation_use_levels\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_bf56dccd962526d11fbddcff926\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_b6509f9f0f5f649e96b11d729d0\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_6ae29fc53fa1527245696ca0f0b\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_eeb1687179797c7b0eeb8ae5856\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_5b9e831ba00617f08e70c54405d\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`potential_innovation_use_level\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`potential_innovation_readiness_level\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`current_innovation_use_level\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`current_innovation_readiness_level\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`assessed_during_expert_workshop_id\``);
        await queryRunner.query(`DROP TABLE \`assessed_during_expert_workshop\``);
    }

}
