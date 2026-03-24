import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewResultStatusForBilateralAPI1768396987422 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO \`result_status\` (status_name, status_description) VALUES ('Pending Review', 'API Bilateral Status')`,
        );
        await queryRunner.query(
            `INSERT INTO \`result_status\` (status_name, status_description) VALUES ('Approved', 'API Bilateral Status')`,
        );
        await queryRunner.query(
            `INSERT INTO \`result_status\` (status_name, status_description) VALUES ('Rejected', 'API Bilateral Status')`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM \`result_status\` WHERE status_name = 'Pending Review' AND status_description = 'API Bilateral Status'`,
        );
        await queryRunner.query(
            `DELETE FROM \`result_status\` WHERE status_name = 'Approved' AND status_description = 'API Bilateral Status'`,
        );
        await queryRunner.query(
            `DELETE FROM \`result_status\` WHERE status_name = 'Rejected' AND status_description = 'API Bilateral Status'`,
        );
    }

}
