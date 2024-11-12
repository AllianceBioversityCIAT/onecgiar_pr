import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditFieldsInvestmentDiscontinuedOpt1730129133494 implements MigrationInterface {
    name = 'AddAuditFieldsInvestmentDiscontinuedOpt1730129133494'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD \`order\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD \`created_by\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD \`last_updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP FOREIGN KEY \`FK_c978260e79ad4180b8d27f836a5\``);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` CHANGE \`result_type_id\` \`result_type_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD CONSTRAINT \`FK_c978260e79ad4180b8d27f836a5\` FOREIGN KEY (\`result_type_id\`) REFERENCES \`result_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD CONSTRAINT \`FK_3bd91ba871202b6c9cb348c8566\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD CONSTRAINT \`FK_bcc18f42caf3c7435958fe50406\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP FOREIGN KEY \`FK_bcc18f42caf3c7435958fe50406\``);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP FOREIGN KEY \`FK_3bd91ba871202b6c9cb348c8566\``);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP FOREIGN KEY \`FK_c978260e79ad4180b8d27f836a5\``);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` CHANGE \`result_type_id\` \`result_type_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD CONSTRAINT \`FK_c978260e79ad4180b8d27f836a5\` FOREIGN KEY (\`result_type_id\`) REFERENCES \`result_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP COLUMN \`last_updated_by\``);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP COLUMN \`last_updated_date\``);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP COLUMN \`created_date\``);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP COLUMN \`created_by\``);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP COLUMN \`is_active\``);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP COLUMN \`order\``);
    }

}
