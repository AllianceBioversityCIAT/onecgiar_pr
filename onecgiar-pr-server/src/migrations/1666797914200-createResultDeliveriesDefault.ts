import { MigrationInterface, QueryRunner } from "typeorm";

export class createResultDeliveriesDefault1666797914200 implements MigrationInterface {
    name = 'createResultDeliveriesDefault1666797914200'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`partner_delivery_type\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL DEFAULT 1`);

        await queryRunner.query(
            `INSERT INTO \`partner_delivery_type\` (name) VALUES ('Scaling')`,
        );
        await queryRunner.query(
            `INSERT INTO \`partner_delivery_type\` (name) VALUES ('Demand')`,
        );
        await queryRunner.query(
            `INSERT INTO \`partner_delivery_type\` (name) VALUES ('Innovation')`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_institutions_by_deliveries_type\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`partner_delivery_type\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL`);
    }

}
