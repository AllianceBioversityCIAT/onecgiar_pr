import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateDiscontinuedOptions1712162692416 implements MigrationInterface {
    name = 'UpdateDiscontinuedOptions1712162692416'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD \`result_type_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` ADD CONSTRAINT \`FK_c978260e79ad4180b8d27f836a5\` FOREIGN KEY (\`result_type_id\`) REFERENCES \`result_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`
        INSERT INTO
            investment_discontinued_option (\`option\`, result_type_id)
        VALUES
            (
                "No or limited progress in improving the readiness and/or use of the innovation package.",
                10
            ),
            (
                "The innovation lead and/or team took up new responsibilities.",
                10
            ),
            (
                "Limited Initiative resource availability required deprioritization of the innovation package.",
                10
            ),
            (
                "Limited bilateral co-investment required deprioritization of the innovation package.",
                10
            ),
            (
                "Absence of strong demand and scaling partners for the innovation package.",
                10
            ),
            ('Other', 10);
        `);
        await queryRunner.query(`
        UPDATE
            investment_discontinued_option
        SET
            result_type_id = 7
        WHERE
            investment_discontinued_option_id IN (1, 2, 3, 4, 5, 6);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP FOREIGN KEY \`FK_c978260e79ad4180b8d27f836a5\``);
        await queryRunner.query(`ALTER TABLE \`investment_discontinued_option\` DROP COLUMN \`result_type_id\``);
    }

}
