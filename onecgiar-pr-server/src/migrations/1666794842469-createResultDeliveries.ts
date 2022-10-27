import { MigrationInterface, QueryRunner } from "typeorm";

export class createResultDeliveries1666794842469 implements MigrationInterface {
    name = 'createResultDeliveries1666794842469'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`partner_delivery_type\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`is_active\` tinyint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_by_institutions_by_deliveries_type\` (\`id\` int NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`partner_delivery_type_id\` int NOT NULL, \`result_by_institution_id\` bigint NOT NULL, \`versions_id\` bigint NOT NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` ADD CONSTRAINT \`FK_58f7d27eb575524cf16814e046f\` FOREIGN KEY (\`partner_delivery_type_id\`) REFERENCES \`partner_delivery_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` ADD CONSTRAINT \`FK_82816597b0a0491f9b88ca80696\` FOREIGN KEY (\`result_by_institution_id\`) REFERENCES \`results_by_institution\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` ADD CONSTRAINT \`FK_76230eb8a8feedb43f23529f1ad\` FOREIGN KEY (\`versions_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` ADD CONSTRAINT \`FK_c606694f9314bd88b0c672bf681\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` ADD CONSTRAINT \`FK_3f76dc774754c6a5c61aa78dd4b\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` DROP FOREIGN KEY \`FK_3f76dc774754c6a5c61aa78dd4b\``);
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` DROP FOREIGN KEY \`FK_c606694f9314bd88b0c672bf681\``);
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` DROP FOREIGN KEY \`FK_76230eb8a8feedb43f23529f1ad\``);
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` DROP FOREIGN KEY \`FK_82816597b0a0491f9b88ca80696\``);
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` DROP FOREIGN KEY \`FK_58f7d27eb575524cf16814e046f\``);
        await queryRunner.query(`DROP TABLE \`result_by_institutions_by_deliveries_type\``);
        await queryRunner.query(`DROP TABLE \`partner_delivery_type\``);
    }

}
