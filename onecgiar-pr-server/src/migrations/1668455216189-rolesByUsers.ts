import { MigrationInterface, QueryRunner } from "typeorm"

export class rolesByUsers1668455216189 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 113, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 286, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 24, 286, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 287, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (6, 24, 287, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 254, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (5, 24, 254, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 318, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 319, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 90, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 80, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 320, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 321, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 71, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 3, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 2, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 119, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 294, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 101, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 322, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 96, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 98, 307);`);

        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (1, null, 86, 307);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
