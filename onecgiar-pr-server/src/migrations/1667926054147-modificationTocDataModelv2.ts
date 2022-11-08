import { MigrationInterface, QueryRunner } from "typeorm"

export class modificationTocDataModelv21667926054147 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO \`toc_level\` (name, description) VALUES ('Work package Output',''),('Work package Outcome',''),('End of Initiative Outcome',''),('Action Area Outcome','')`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
