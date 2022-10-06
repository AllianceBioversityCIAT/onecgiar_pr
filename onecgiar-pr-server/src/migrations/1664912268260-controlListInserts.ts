import { MigrationInterface, QueryRunner } from "typeorm"

export class controlListInserts1664912268260 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const resultLevelOutcome = await queryRunner.query(`INSERT INTO \`result_level\` (name, description) VALUES ('Outcome', '')`);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Policy Change','',?)`,[resultLevelOutcome.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Innovation use','',?)`,[resultLevelOutcome.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Organizational change','',?)`,[resultLevelOutcome.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Other outcome','',?)`,[resultLevelOutcome.insertId]);

        const resultLevelOutput = await queryRunner.query(`INSERT INTO \`result_level\` (name, description) VALUES ('Output', '')`);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Capacity Sharing for Development','',?)`,[resultLevelOutput.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Knowledge Product','',?)`,[resultLevelOutput.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Innovation Developmen','',?)`,[resultLevelOutput.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Other output','',?)`,[resultLevelOutput.insertId]);

        const resultLevelImpact = await queryRunner.query(`INSERT INTO \`result_level\` (name, description) VALUES ('Impact', '')`);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Impact Contribution','',?)`,[resultLevelImpact.insertId]);

        await queryRunner.query(`INSERT INTO \`initiative_roles\` (name, description) VALUES ('Owner', '')`);
        await queryRunner.query(`INSERT INTO \`initiative_roles\` (name, description) VALUES ('Contributor', '')`);

        await queryRunner.query(`INSERT INTO \`version\` (version_name, start_date, end_date) VALUES ('Baseline', NULL, NULL)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
