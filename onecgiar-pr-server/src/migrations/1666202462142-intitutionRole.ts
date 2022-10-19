import { MigrationInterface, QueryRunner } from "typeorm";

export class intitutionRole1666202462142 implements MigrationInterface {
    name = 'intitutionRole1666202462142'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_7f636e5aa0cfd9c268532c48de4\` FOREIGN KEY (\`institution_roles_id\`) REFERENCES \`institution_role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_7f636e5aa0cfd9c268532c48de4\``);
    }

}
