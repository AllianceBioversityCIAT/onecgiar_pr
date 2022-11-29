import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorClarisafix1667837200222 implements MigrationInterface {
    name = 'refactorClarisafix1667837200222'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcome\` CHANGE \`outcomeId\` \`id\` int NOT NULL AUTO_INCREMENT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcome\` CHANGE \`id\` \`outcomeId\` int NOT NULL AUTO_INCREMENT`);
    }

}
