import { MigrationInterface, QueryRunner } from "typeorm"

export class newUsers1668453246675 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO
                \`prdb\`.\`users\` (
                id,
                    first_name,
                    last_name,
                    email,
                    is_cgiar,
                    password
                )
            VALUES
                (
                    318,
                    'Mariagiulia',
                    'Mariani',
                    'm.mariani@cgiar.org',
                    1,
                    null
            );`);

        await queryRunner.query(`INSERT INTO
                \`prdb\`.\`users\` (
                id,
                    first_name,
                    last_name,
                    email,
                    is_cgiar,
                    password
                )
            VALUES
                (
                    319,
                    'Laura',
                    'Reuman',
                    'l.reumann@cgiar.org',
                    1,
                    null
            );`);

        await queryRunner.query(`INSERT INTO
                \`prdb\`.\`users\` (
                id,
                    first_name,
                    last_name,
                    email,
                    is_cgiar,
                    password
                )
            VALUES
                (
                    320,
                    'Frank',
                    'Place',
                    'f.place@cgiar.org',
                    1,
                    null
            );`);

        await queryRunner.query(`INSERT INTO
                \`prdb\`.\`users\` (
                id,
                    first_name,
                    last_name,
                    email,
                    is_cgiar,
                    password
                )
            VALUES
                (
                    321,
                    'Fatma',
                    'Attwa',
                    'f.attwa@cgiar.org',
                    1,
                    null
            );`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
