import { MigrationInterface, QueryRunner } from "typeorm";

export class clarisaRegions1665589526533 implements MigrationInterface {
    name = 'clarisaRegions1665589526533'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`clarisa_regions\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
