import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorClarisTables1663882791655 implements MigrationInterface {
    name = 'refactorClarisTables1663882791655'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_outcome_indicators\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_outcome_indicators\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_outcome_indicators\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`institution_types\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`institution_types\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`institution_types\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_melia_study_type\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_melia_study_type\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_melia_study_type\` DROP COLUMN \`updated_by\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_melia_study_type\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_melia_study_type\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_melia_study_type\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`institution_types\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`institution_types\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`institution_types\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_outcome_indicators\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_outcome_indicators\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_outcome_indicators\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` ADD \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
    }

}
