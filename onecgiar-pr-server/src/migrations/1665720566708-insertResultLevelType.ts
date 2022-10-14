import { MigrationInterface, QueryRunner } from "typeorm"

export class insertResultLevelType1665720566708 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM \`result_by_level\``);
        await queryRunner.query(`DELETE FROM \`results_by_evidence\``);
        await queryRunner.query(`DELETE FROM \`evidence\``);
        await queryRunner.query(`DELETE FROM \`results_by_inititiative\``);
        await queryRunner.query(`DELETE FROM \`results_by_institution\``);
        await queryRunner.query(`DELETE FROM \`results_by_institution_type\``);
        await queryRunner.query(`DELETE FROM \`result\``);
        await queryRunner.query(`DELETE FROM \`result_type\``);
        await queryRunner.query(`DELETE FROM \`result_level\``);
        await queryRunner.query(`DELETE FROM \`version\``);

        await queryRunner.query(`ALTER TABLE \`result_by_level\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`result_type\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`result_level\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`evidence\` AUTO_INCREMENT = 1`);
        await queryRunner.query(
          `ALTER TABLE \`results_by_evidence\` AUTO_INCREMENT = 1`,
        );
        await queryRunner.query(
          `ALTER TABLE \`results_by_inititiative\` AUTO_INCREMENT = 1`,
        );
        await queryRunner.query(
          `ALTER TABLE \`results_by_institution\` AUTO_INCREMENT = 1`,
        );
        await queryRunner.query(
          `ALTER TABLE \`results_by_institution_type\` AUTO_INCREMENT = 1`,
        );
        await queryRunner.query(`ALTER TABLE \`result\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`version\` AUTO_INCREMENT = 1`);

        const resultLevelImpact = await queryRunner.query(
            `INSERT INTO \`result_level\` (name, description) VALUES ('Impact', 'A durable change in the condition of people and their environment brought about by a chain of events or change to which research, innovations and related activities have contributed.')`,
          );

        const ActionAreaOutcome = await queryRunner.query(
          `INSERT INTO \`result_level\` (name, description) VALUES ('Action Area Outcome', 'A change in knowledge, skills, attitudes and/or relationships, which manifests as a change in behavior in particular actors, to which research outputs and related activities have contributed.')`,
        );

        const InitiativeOutcome = await queryRunner.query(
          `INSERT INTO \`result_level\` (name, description) VALUES ('Initiative Outcome', 'A change in knowledge, skills, attitudes and/or relationships, which manifests as a change in behavior in particular actors, to which research outputs and related activities have contributed.')`,
        );

        const InitiativeOutput = await queryRunner.query(
          `INSERT INTO \`result_level\` (name, description) VALUES ('Initiative Output', 'Knowledge, or a technical or institutional advancement produced by CGIAR research, engagement and/or capacity development activities.')`,
        );

        const PolicyChange = await queryRunner.query(
            `INSERT INTO \`result_type\` (name, description) VALUES ('Policy Change', '')`,
        );
        const InnovationUse = await queryRunner.query(
            `INSERT INTO \`result_type\` (name, description) VALUES ('Innovation use', '')`,
        );
        const CapacityChange = await queryRunner.query(
            `INSERT INTO \`result_type\` (name, description) VALUES ('Capacity change', '')`,
        );
        const OtherOutcome = await queryRunner.query(
            `INSERT INTO \`result_type\` (name, description) VALUES ('Other outcome', '')`,
        );
        const CapacitySharing = await queryRunner.query(
            `INSERT INTO \`result_type\` (name, description) VALUES ('Capacity Sharing for Development', '')`,
        );
        const KnowledgeProduct = await queryRunner.query(
            `INSERT INTO \`result_type\` (name, description) VALUES ('Knowledge Product', '')`,
        );
        const InnovationDevelopment = await queryRunner.query(
            `INSERT INTO \`result_type\` (name, description) VALUES ('Innovation Development', '')`,
        );
        const OtherOutput = await queryRunner.query(
            `INSERT INTO \`result_type\` (name, description) VALUES ('Other output', '')`,
        );
        const ImpactContribution = await queryRunner.query(
            `INSERT INTO \`result_type\` (name, description) VALUES ('Impact Contribution', '')`,
        );



        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [ActionAreaOutcome.insertId, PolicyChange.insertId]
        );
        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [ActionAreaOutcome.insertId, InnovationUse.insertId]
        );
        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [ActionAreaOutcome.insertId, CapacityChange.insertId]
        );
        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [ActionAreaOutcome.insertId, OtherOutcome.insertId]
        );


        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [InitiativeOutcome.insertId, PolicyChange.insertId]
        );
        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [InitiativeOutcome.insertId, InnovationUse.insertId]
        );
        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [InitiativeOutcome.insertId, CapacityChange.insertId]
        );
        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [InitiativeOutcome.insertId, OtherOutcome.insertId]
        );


        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [InitiativeOutput.insertId, CapacitySharing.insertId]
        );
        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [InitiativeOutput.insertId, KnowledgeProduct.insertId]
        );
        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [InitiativeOutput.insertId, InnovationDevelopment.insertId]
        );
        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [InitiativeOutput.insertId, OtherOutput.insertId]
        );


        await queryRunner.query(
            `INSERT INTO \`result_by_level\` (result_level_id, result_type_id) VALUES (?, ?)`, [resultLevelImpact.insertId, ImpactContribution.insertId]
        );





    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
