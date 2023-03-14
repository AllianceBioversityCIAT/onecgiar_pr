import { MigrationInterface, QueryRunner } from "typeorm";

export class createExpertsAndExpertises1678830495417 implements MigrationInterface {
    name = 'createExpertsAndExpertises1678830495417'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`expertises\` (\`expertises_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NULL, \`description\` text NULL, PRIMARY KEY (\`expertises_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`innovation_packaging_expert\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`innovation_packaging_expert_id\` bigint NOT NULL AUTO_INCREMENT, \`first_name\` text NOT NULL, \`last_name\` text NOT NULL, \`email\` text NOT NULL, \`organization_id\` int NOT NULL, \`expertises_id\` bigint NOT NULL, \`result_id\` bigint NOT NULL, PRIMARY KEY (\`innovation_packaging_expert_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`innovation_packaging_expert\` ADD CONSTRAINT \`FK_893b40ebd17317a0c2cc255f1ce\` FOREIGN KEY (\`expertises_id\`) REFERENCES \`expertises\`(\`expertises_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`innovation_packaging_expert\` ADD CONSTRAINT \`FK_093cde6bf7610ab5a74ca4b54de\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`innovation_packaging_expert\` ADD CONSTRAINT \`FK_bc37dc772c565a78d628309b809\` FOREIGN KEY (\`organization_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`innovation_packaging_expert\` ADD CONSTRAINT \`FK_b2287ac25cc7d215a00c613d91d\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`innovation_packaging_expert\` DROP FOREIGN KEY \`FK_b2287ac25cc7d215a00c613d91d\``);
        await queryRunner.query(`ALTER TABLE \`innovation_packaging_expert\` DROP FOREIGN KEY \`FK_bc37dc772c565a78d628309b809\``);
        await queryRunner.query(`ALTER TABLE \`innovation_packaging_expert\` DROP FOREIGN KEY \`FK_093cde6bf7610ab5a74ca4b54de\``);
        await queryRunner.query(`ALTER TABLE \`innovation_packaging_expert\` DROP FOREIGN KEY \`FK_893b40ebd17317a0c2cc255f1ce\``);
        await queryRunner.query(`DROP TABLE \`innovation_packaging_expert\``);
        await queryRunner.query(`DROP TABLE \`expertises\``);
    }

}
