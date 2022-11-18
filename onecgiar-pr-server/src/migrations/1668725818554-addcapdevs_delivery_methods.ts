import { MigrationInterface, QueryRunner } from "typeorm";

export class addcapdevsDeliveryMethods1668725818554 implements MigrationInterface {
    name = 'addcapdevsDeliveryMethods1668725818554'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`capdevs_delivery_methods\` (\`capdev_delivery_method_id\` int NOT NULL AUTO_INCREMENT, \`name\` text NULL, \`description\` text NULL, PRIMARY KEY (\`capdev_delivery_method_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD \`male_using\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD \`female_using\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD \`capdev_delivery_method_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD \`capdev_term_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD CONSTRAINT \`FK_d9c879a34488fb6f37dfe99d797\` FOREIGN KEY (\`capdev_delivery_method_id\`) REFERENCES \`capdevs_delivery_methods\`(\`capdev_delivery_method_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD CONSTRAINT \`FK_7c12b899a06f764202d32298a97\` FOREIGN KEY (\`capdev_term_id\`) REFERENCES \`capdevs_term\`(\`capdev_term_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP FOREIGN KEY \`FK_7c12b899a06f764202d32298a97\``);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP FOREIGN KEY \`FK_d9c879a34488fb6f37dfe99d797\``);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP COLUMN \`capdev_term_id\``);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP COLUMN \`capdev_delivery_method_id\``);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP COLUMN \`female_using\``);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP COLUMN \`male_using\``);
        await queryRunner.query(`DROP TABLE \`capdevs_delivery_methods\``);
    }

}
