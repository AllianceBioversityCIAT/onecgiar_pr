import { MigrationInterface, QueryRunner } from "typeorm"

export class addCapDevMethodsAndTerm1668784095214 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(
            `INSERT INTO \`capdevs_delivery_methods\` (name) VALUES ('virtual / Online'),('Face to Face'),('Blended (IRL and Virtual)')`,
        );

        await queryRunner.query(
            `INSERT INTO \`capdevs_term\` (name, term, description) VALUES ('PhD', 'Long-term', '3 months and above'),('Master', 'Long-term', '3 months and above'),('Short-term', 'Short-term', '3 months or less')`,
        );

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
