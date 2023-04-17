import { MigrationInterface, QueryRunner } from "typeorm"

export class addedDataForNppAndEvidenceTypes1681399243514 implements MigrationInterface {
    name = 'addedDataForNppAndEvidenceTypes1681399243514'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        INSERT INTO non_pooled_project_type (name)
        VALUES ('contributing_non_pooled_project'),
               ('expected_bilateral');
        `);

        await queryRunner.query(`
        INSERT INTO evidence_types (name, description)
        VALUES ('main', 'Main evidence'),
            ('supplementary', 'Supplementary evidence'),
            ('ipsr_pictures', 'IPSR pictures'),
            ('ipsr_materials', 'IPSR materials');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
