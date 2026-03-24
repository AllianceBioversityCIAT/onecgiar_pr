import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGlobalParameterAvisa1770219180815 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO global_parameters (name, value, description, global_parameter_category_id)
            VALUES ('sgp_02_toc_version', 'a993d3ff-fd7d-4d27-a646-9c6b42dc8da3', 'Version of the SGP-02 TOC', 2);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM global_parameters WHERE name = 'sgp_02_toc_version';
        `);
    }

}
