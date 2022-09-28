import { MigrationInterface, QueryRunner } from "typeorm"

export class rolesInserts1664370914432 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const rolesLevelIdApp = await queryRunner.query(`INSERT INTO \`role_levels\` (name) VALUES (\'Application\')`);
        await queryRunner.query(`INSERT INTO \`role\` (description,role_level_id) VALUES (\'Admin\',?)`,[rolesLevelIdApp.insertId]);
        await queryRunner.query(`INSERT INTO \`role\` (description,role_level_id) VALUES (\'Guest\',?)`,[rolesLevelIdApp.insertId]);

        const rolesLevelIdInit = await queryRunner.query(`INSERT INTO \`role_levels\` (name) VALUES (\'Initiative\')`);
        await queryRunner.query(`INSERT INTO \`role\` (description,role_level_id) VALUES (\'Lead\',?)`,[rolesLevelIdInit.insertId]);
        await queryRunner.query(`INSERT INTO \`role\` (description,role_level_id) VALUES (\'Co-Lead\',?)`,[rolesLevelIdInit.insertId]);
        await queryRunner.query(`INSERT INTO \`role\` (description,role_level_id) VALUES (\'Coordinator\',?)`,[rolesLevelIdInit.insertId]);
        await queryRunner.query(`INSERT INTO \`role\` (description,role_level_id) VALUES (\'Member\',?)`,[rolesLevelIdInit.insertId]);

        const rolesLevelIdAct = await queryRunner.query(`INSERT INTO \`role_levels\` (name) VALUES (\'Action Area\')`);
        await queryRunner.query(`INSERT INTO \`role\` (description,role_level_id) VALUES (\'Action Area Science Global Director\',?)`,[rolesLevelIdAct.insertId]);
        await queryRunner.query(`INSERT INTO \`role\` (description,role_level_id) VALUES (\'Action Area Coordinator\',?)`,[rolesLevelIdAct.insertId]);

        



    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
