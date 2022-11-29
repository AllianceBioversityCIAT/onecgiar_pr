import { MigrationInterface, QueryRunner } from "typeorm";

export class addClarisaGlobalTargets1669221556225 implements MigrationInterface {
    name = 'addClarisaGlobalTargets1669221556225'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` DROP FOREIGN KEY \`FK_adbcfdd27fb4523599f288cc5f6\``);
        await queryRunner.query(`CREATE TABLE \`results_impact_area_target\` (\`result_impact_area_target_id\` int NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`result_id\` bigint NULL, \`impact_area_target_id\` int NULL, \`version_id\` bigint NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`result_impact_area_target_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_impact_area_indicators\` (\`results_impact_area_indicator_id\` int NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`impact_area_indicator_id\` int NULL, \`result_id\` bigint NULL, \`version_id\` bigint NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`results_impact_area_indicator_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` CHANGE \`id\` \`id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` DROP COLUMN \`impact_area_id\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` ADD \`financialCode\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` ADD \`targetId\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` ADD \`impactAreaId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` CHANGE \`name\` \`name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` CHANGE \`description\` \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` ADD CONSTRAINT \`FK_2b5db214e0a59bf94655de190e8\` FOREIGN KEY (\`impactAreaId\`) REFERENCES \`clarisa_impact_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_target\` ADD CONSTRAINT \`FK_0ebe2637a747fd8ecb0250f48a1\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_target\` ADD CONSTRAINT \`FK_665977416ac609a96026c3f6aa3\` FOREIGN KEY (\`impact_area_target_id\`) REFERENCES \`clarisa_global_targets\`(\`targetId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_target\` ADD CONSTRAINT \`FK_e2d045bcad4f04a0227c9e9b404\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_target\` ADD CONSTRAINT \`FK_20aa4ac4ca31aa142f97e6ca19f\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_target\` ADD CONSTRAINT \`FK_8858a8c27beb0a2c00a738cd290\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_indicators\` ADD CONSTRAINT \`FK_22e2f227ba7b3dc0746dce5bbda\` FOREIGN KEY (\`impact_area_indicator_id\`) REFERENCES \`clarisa_impact_area_indicator\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_indicators\` ADD CONSTRAINT \`FK_90d2e2abef0f9d4b8f2e00d58a1\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_indicators\` ADD CONSTRAINT \`FK_c36f5eae67871a6f2a0d88055b9\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_indicators\` ADD CONSTRAINT \`FK_5907e5865cee637791fb33d95c2\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_indicators\` ADD CONSTRAINT \`FK_d382cb42f18db74250bc05765ec\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_impact_area_indicators\` DROP FOREIGN KEY \`FK_d382cb42f18db74250bc05765ec\``);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_indicators\` DROP FOREIGN KEY \`FK_5907e5865cee637791fb33d95c2\``);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_indicators\` DROP FOREIGN KEY \`FK_c36f5eae67871a6f2a0d88055b9\``);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_indicators\` DROP FOREIGN KEY \`FK_90d2e2abef0f9d4b8f2e00d58a1\``);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_indicators\` DROP FOREIGN KEY \`FK_22e2f227ba7b3dc0746dce5bbda\``);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_target\` DROP FOREIGN KEY \`FK_8858a8c27beb0a2c00a738cd290\``);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_target\` DROP FOREIGN KEY \`FK_20aa4ac4ca31aa142f97e6ca19f\``);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_target\` DROP FOREIGN KEY \`FK_e2d045bcad4f04a0227c9e9b404\``);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_target\` DROP FOREIGN KEY \`FK_665977416ac609a96026c3f6aa3\``);
        await queryRunner.query(`ALTER TABLE \`results_impact_area_target\` DROP FOREIGN KEY \`FK_0ebe2637a747fd8ecb0250f48a1\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` DROP FOREIGN KEY \`FK_2b5db214e0a59bf94655de190e8\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` CHANGE \`description\` \`description\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` CHANGE \`name\` \`name\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` DROP COLUMN \`impactAreaId\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` DROP COLUMN \`targetId\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_impact_areas\` DROP COLUMN \`financialCode\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` ADD \`impact_area_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` ADD \`id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`DROP TABLE \`results_impact_area_indicators\``);
        await queryRunner.query(`DROP TABLE \`results_impact_area_target\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_targets\` ADD CONSTRAINT \`FK_adbcfdd27fb4523599f288cc5f6\` FOREIGN KEY (\`impact_area_id\`) REFERENCES \`clarisa_impact_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
