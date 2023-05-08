import { MigrationInterface, QueryRunner } from "typeorm";

export class addedNewDeliveryType1678477996786 implements MigrationInterface {
    name = 'addedNewDeliveryType1678477996786'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`partner_delivery_type\` ADD \`description\` text NULL`);
        await queryRunner.query(`INSERT INTO partner_delivery_type (name, description) VALUES('Other', 'Any partner role that does not fit the other categories.');`);
        await queryRunner.query(`UPDATE partner_delivery_type SET description = 'Organizations or entities that CGIAR collaborates with to advance the uptake and use of  innovations at scale.' WHERE id = 1`);
        await queryRunner.query(`UPDATE partner_delivery_type SET description = 'Organizations or entities that have (expressed) an explicit or implicit demand for an innovation, change or who aspire to a specific goal or impact to which CGIAR can contribute.' WHERE id = 2`);
        await queryRunner.query(`UPDATE partner_delivery_type SET description = 'Organizations or entities that CGIAR collaborates and co-invests with to improve the readiness  of innovations to contribute to impact at scale.' WHERE id = 3`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`partner_delivery_type\` DROP COLUMN \`description\``);
    }

}
