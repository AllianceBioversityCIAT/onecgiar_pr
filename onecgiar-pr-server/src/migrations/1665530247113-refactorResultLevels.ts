import { MigrationInterface, QueryRunner } from "typeorm"

export class refactorResultLevels1665530247113 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`DELETE FROM \`results_by_evidence\``);
        await queryRunner.query(`DELETE FROM \`evidence\``);
        await queryRunner.query(`DELETE FROM \`results_by_inititiative\``);
        await queryRunner.query(`DELETE FROM \`results_by_institution\``);
        await queryRunner.query(`DELETE FROM \`results_by_institution_type\``);
        await queryRunner.query(`DELETE FROM \`result\``);
        await queryRunner.query(`DELETE FROM \`result_type\``);
        await queryRunner.query(`DELETE FROM \`result_level\``);
        await queryRunner.query(`DELETE FROM \`version\``);
        
        await queryRunner.query(`ALTER TABLE \`result_type\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`result_level\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`evidence\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`results_by_evidence\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`result\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`version\` AUTO_INCREMENT = 1`);

        const resultLevelImpact = await queryRunner.query(`INSERT INTO \`result_level\` (name, description) VALUES ('Impact', 'A durable change in the condition of people and their environment brought about by a chain of events or change to which research, innovations and related activities have contributed.')`);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Impact Contribution','',?)`,[resultLevelImpact.insertId]);

        const resultLevelOutcome = await queryRunner.query(`INSERT INTO \`result_level\` (name, description) VALUES ('Outcome', 'A change in knowledge, skills, attitudes and/or relationships, which manifests as a change in behavior in particular actors, to which research outputs and related activities have contributed.')`);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Policy Change','',?)`,[resultLevelOutcome.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Innovation use','',?)`,[resultLevelOutcome.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Organizational change','',?)`,[resultLevelOutcome.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Other outcome','',?)`,[resultLevelOutcome.insertId]);

        const resultLevelOutput = await queryRunner.query(`INSERT INTO \`result_level\` (name, description) VALUES ('Output', 'Knowledge, or a technical or institutional advancement produced by CGIAR research, engagement and/or capacity development activities.')`);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Capacity Sharing for Development','',?)`,[resultLevelOutput.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Knowledge Product','',?)`,[resultLevelOutput.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Innovation Developmen','',?)`,[resultLevelOutput.insertId]);
        await queryRunner.query(`INSERT INTO \`result_type\` (name,description,result_level_id) VALUES ('Other output','',?)`,[resultLevelOutput.insertId]);

        await queryRunner.query(`INSERT INTO \`version\` (version_name, start_date, end_date) VALUES ('Baseline', NULL, NULL)`);



    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
