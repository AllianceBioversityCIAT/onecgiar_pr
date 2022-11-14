import { MigrationInterface, QueryRunner } from "typeorm"

export class resultsByInitiativeTest1668442157335 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO
        \`prdb\`.\`result\` (
                                       id,
                                        version_id,
                                        result_type_id,
                                        created_by,
                                        result_level_id,
                                        title
                                    )
                                VALUES
                                    (
                                        54,
                                        1,
                                        1,
                                        307,
                                        2,
                                        'Set of training manuals for improving the quality and safety of informal dairy and pork value chains in Assam (India)'
                                    );
        `);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (1,1,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (2,1,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (3,2,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (4,2,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (5,3,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (6,3,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (7,4,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (8,4,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (9,5,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (10,5,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (11,6,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (12,6,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (13,7,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (14,7,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (15,7,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (16,7,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (17,10,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (18,10,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (19,10,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (20,10,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (21,11,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (22,11,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (23,12,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (24,12,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (25,13,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (26,13,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (27,14,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (28,14,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (29,15,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (30,15,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (31,16,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (32,16,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (33,17,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (34,17,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (35,18,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (36,18,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (37,19,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (38,19,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (39,20,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (40,20,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (41,21,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (42,21,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (43,22,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (44,22,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (45,23,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (46,23,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (47,24,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (48,24,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (49,25,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (50,26,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (51,26,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (52,27,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (53,27,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (54,28,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (55,28,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (56,29,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (57,29,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (58,30,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (59,30,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (60,31,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (61,31,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (62,32,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (63,32,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (64,33,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (65,33,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (66,34,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (67,34,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (69,35,1,1,307)`);
        await queryRunner.query(`INSERT INTO \`results_by_inititiative\` (result_id,inititiative_id,initiative_role_id,version_id,created_by) VALUES (69,35,1,1,307)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
