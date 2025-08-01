import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPortfolioColumnToClarisaInitiatives1753703918541 implements MigrationInterface {
    name = 'AddPortfolioColumnToClarisaInitiatives1753703918541'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_initiatives\` ADD \`portfolio_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_initiatives\` ADD CONSTRAINT \`FK_2817be71cf0c7a269f5cb3306d0\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`clarisa_portfolios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`UPDATE \`clarisa_initiatives\` SET \`portfolio_id\` = 2`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_initiatives\` DROP FOREIGN KEY \`FK_2817be71cf0c7a269f5cb3306d0\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_initiatives\` DROP COLUMN \`portfolio_id\``);
    }

}
