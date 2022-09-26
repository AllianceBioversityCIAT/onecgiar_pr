import { MigrationInterface, QueryRunner } from "typeorm";

export class updateresult1664209018276 implements MigrationInterface {
    name = 'updateresult1664209018276'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_bbd96dc95ae93743a0995c37df6\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_4e113ec11bf1911212375ec5e9f\``);
        await queryRunner.query(`CREATE TABLE \`evidence_types\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`initiative_roles\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(45) NULL, \`description\` varchar(45) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_bbd96dc95ae93743a0995c37df6\` FOREIGN KEY (\`evidence_types_id\`) REFERENCES \`evidence_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_4e113ec11bf1911212375ec5e9f\` FOREIGN KEY (\`initiative_role_id\`) REFERENCES \`initiative_roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_4e113ec11bf1911212375ec5e9f\``);
        await queryRunner.query(`ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_bbd96dc95ae93743a0995c37df6\``);
        await queryRunner.query(`DROP TABLE \`initiative_roles\``);
        await queryRunner.query(`DROP TABLE \`evidence_types\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_4e113ec11bf1911212375ec5e9f\` FOREIGN KEY (\`initiative_role_id\`) REFERENCES \`initiative_role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_bbd96dc95ae93743a0995c37df6\` FOREIGN KEY (\`evidence_types_id\`) REFERENCES \`evidence_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
