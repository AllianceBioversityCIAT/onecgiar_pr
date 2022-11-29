import { MigrationInterface, QueryRunner } from "typeorm"

export class insertRequestData1669405102671 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO \`request_status\` (name) VALUES ('Pending'),('Accepted'),('Rejected')`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
