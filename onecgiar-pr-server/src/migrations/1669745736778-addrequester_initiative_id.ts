import { MigrationInterface, QueryRunner } from "typeorm";

export class addrequesterInitiativeId1669745736778 implements MigrationInterface {
    name = 'addrequesterInitiativeId1669745736778'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD \`requester_initiative_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD CONSTRAINT \`FK_29e928c35f14e6e0946892f160f\` FOREIGN KEY (\`requester_initiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP FOREIGN KEY \`FK_29e928c35f14e6e0946892f160f\``);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP COLUMN \`requester_initiative_id\``);
    }

}
