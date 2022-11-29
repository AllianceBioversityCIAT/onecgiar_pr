import { MigrationInterface, QueryRunner } from "typeorm";

export class changename1667954266846 implements MigrationInterface {
    name = 'changename1667954266846'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`toc_result\` CHANGE \`titel\` \`title\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`toc_result\` CHANGE \`title\` \`titel\` text NULL`);
    }

}
