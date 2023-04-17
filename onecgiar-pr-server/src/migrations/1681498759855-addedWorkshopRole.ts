import { MigrationInterface, QueryRunner } from "typeorm"

export class addedWorkshopRole1681498759855 implements MigrationInterface {
    name = 'addedWorkshopRole1681498759855'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`        
        INSERT INTO evidence_types (name, description)
        VALUES ('ipsr_workshop ', 'IPSR Workshop list of participants');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`is_result_ip_published\``);
    }

}
