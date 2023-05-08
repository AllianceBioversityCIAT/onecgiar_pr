import { MigrationInterface, QueryRunner } from "typeorm";

export class creatDataModelStep31680212407557 implements MigrationInterface {
    name = 'creatDataModelStep31680212407557'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_ip_result_actors\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_ip_actors_id\` bigint NOT NULL AUTO_INCREMENT, \`women\` bigint NULL, \`women_youth\` bigint NULL, \`men\` bigint NULL, \`men_youth\` bigint NULL, \`result_ip_result_id\` bigint NOT NULL, \`actor_type_id\` bigint NULL, PRIMARY KEY (\`result_ip_actors_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_ip_result_institution_types\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`how_many\` bigint NULL, \`result_ip_results_id\` bigint NOT NULL, \`institution_types_id\` int NULL, \`institution_roles_id\` bigint NULL, \`evidence_link\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_ip_result_measures\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_ip_result_measures_id\` bigint NOT NULL AUTO_INCREMENT, \`unit_of_measure\` text NULL, \`quantity\` bigint NULL, \`result_ip_result_id\` bigint NOT NULL, PRIMARY KEY (\`result_ip_result_measures_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`use_level_evidence_based\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`readiness_level_evidence_based\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`is_expert_workshop_organized\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`readinees_evidence_link\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`use_evidence_link\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`readiness_level_evidence_based\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`use_level_evidence_based\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` ADD CONSTRAINT \`FK_998d837c617d7b8503e6ae83be9\` FOREIGN KEY (\`result_ip_result_id\`) REFERENCES \`result_by_innovation_package\`(\`result_by_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` ADD CONSTRAINT \`FK_1dab9b7fceb52f93f69ce5bbb29\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` ADD CONSTRAINT \`FK_1106ee76169a51b7ccff050857e\` FOREIGN KEY (\`actor_type_id\`) REFERENCES \`actor_type\`(\`actor_type_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_8eed51996f08657fb5431e35edf\` FOREIGN KEY (\`use_level_evidence_based\`) REFERENCES \`clarisa_innovation_readiness_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_f055a283b48e93ffc518eba9df5\` FOREIGN KEY (\`readiness_level_evidence_based\`) REFERENCES \`clarisa_innovation_readiness_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` ADD CONSTRAINT \`FK_1af713d39be6c0935829c829c11\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` ADD CONSTRAINT \`FK_7e8fedcf8c4cdabb6301cba22c4\` FOREIGN KEY (\`result_ip_results_id\`) REFERENCES \`result_by_innovation_package\`(\`result_by_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` ADD CONSTRAINT \`FK_76286b20b6d55b27a070b25cca5\` FOREIGN KEY (\`institution_roles_id\`) REFERENCES \`institution_role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` ADD CONSTRAINT \`FK_a83b364bcbde5f412eb6ea83337\` FOREIGN KEY (\`institution_types_id\`) REFERENCES \`clarisa_institution_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_measures\` ADD CONSTRAINT \`FK_0c862dcaf800129d5b7c59cb199\` FOREIGN KEY (\`result_ip_result_id\`) REFERENCES \`result_by_innovation_package\`(\`result_by_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_measures\` ADD CONSTRAINT \`FK_586dfce83aaea4f2c522aff61fc\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_6b4dc0e713fb4f6899d9ae41e78\` FOREIGN KEY (\`readiness_level_evidence_based\`) REFERENCES \`clarisa_innovation_readiness_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_fd3bb5e8f8734c89becd025f786\` FOREIGN KEY (\`use_level_evidence_based\`) REFERENCES \`clarisa_innovation_readiness_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_fd3bb5e8f8734c89becd025f786\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_6b4dc0e713fb4f6899d9ae41e78\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_measures\` DROP FOREIGN KEY \`FK_586dfce83aaea4f2c522aff61fc\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_measures\` DROP FOREIGN KEY \`FK_0c862dcaf800129d5b7c59cb199\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` DROP FOREIGN KEY \`FK_a83b364bcbde5f412eb6ea83337\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` DROP FOREIGN KEY \`FK_76286b20b6d55b27a070b25cca5\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` DROP FOREIGN KEY \`FK_7e8fedcf8c4cdabb6301cba22c4\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` DROP FOREIGN KEY \`FK_1af713d39be6c0935829c829c11\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_f055a283b48e93ffc518eba9df5\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_8eed51996f08657fb5431e35edf\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` DROP FOREIGN KEY \`FK_1106ee76169a51b7ccff050857e\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` DROP FOREIGN KEY \`FK_1dab9b7fceb52f93f69ce5bbb29\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` DROP FOREIGN KEY \`FK_998d837c617d7b8503e6ae83be9\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`use_level_evidence_based\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`readiness_level_evidence_based\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`use_evidence_link\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`readinees_evidence_link\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`is_expert_workshop_organized\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`readiness_level_evidence_based\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`use_level_evidence_based\``);
        await queryRunner.query(`DROP TABLE \`result_ip_result_measures\``);
        await queryRunner.query(`DROP TABLE \`result_ip_result_institution_types\``);
        await queryRunner.query(`DROP TABLE \`result_ip_result_actors\``);
    }

}
