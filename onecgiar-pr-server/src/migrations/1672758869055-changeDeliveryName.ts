import { MigrationInterface, QueryRunner } from "typeorm"

export class changeDeliveryName1672758869055 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `update \`capdevs_delivery_methods\` set name = 'Virtual / Online' where capdev_delivery_method_id = 1;`,
        );

        await queryRunner.query(
            `update \`capdevs_delivery_methods\` set name = 'In person' where capdev_delivery_method_id = 2;`,
        );

        await queryRunner.query(
            `update \`capdevs_delivery_methods\` set name = 'Blended (in-person and virtual)' where capdev_delivery_method_id = 3;`,
        );

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
