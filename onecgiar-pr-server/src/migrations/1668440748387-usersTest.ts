import { MigrationInterface, QueryRunner } from "typeorm"

export class usersTest1668440748387 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO
        \`prdb\`.\`users\` (
            id,
            first_name,
            last_name,
            email,
            password,
            is_cgiar
        )
    VALUES
        (
            2,
            'Yeckzin',
            'Zuñiga',
            'y.zuniga@cgiar.org',
            NULL,
            1
        );`);

        await queryRunner.query(`INSERT INTO
        \`prdb\`.\`users\` (
            id,
            first_name,
            last_name,
            email,
            password,
            is_cgiar
        )
    VALUES
        (
            3,
            'Hector',
            'Tobon',
            'h.f.tobon@cgiar.org',
            NULL,
            1
        );`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
