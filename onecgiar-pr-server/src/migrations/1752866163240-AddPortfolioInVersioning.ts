import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPortfolioInVersioning1752866163240 implements MigrationInterface {
    name = 'AddPortfolioInVersioning1752866163240'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`version\` ADD \`portfolio_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`version\` ADD CONSTRAINT \`FK_5fcec4485244dd60f571389b20d\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`clarisa_portfolios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`version\` DROP FOREIGN KEY \`FK_5fcec4485244dd60f571389b20d\``);
        await queryRunner.query(`ALTER TABLE \`version\` DROP COLUMN \`portfolio_id\``);
    }

}
