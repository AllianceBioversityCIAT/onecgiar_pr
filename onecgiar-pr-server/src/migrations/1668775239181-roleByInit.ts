import { MigrationInterface, QueryRunner } from "typeorm"

export class roleByInit1668775239181 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Quinn - 1
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 4, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 1, 4, 307);`);
        // Mukankusi
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 5, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 1, 5, 307);`);
        // Banziger
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 280, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 1, 280, 307);`);
        // Slamet-Loedin - 2
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 6, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 2, 6, 307);`);
        // Ghislain
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 7, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 2, 7, 307);`);
        // Yazbek - 3
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 8, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 3, 8, 307);`);
        // Abberton
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 9, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 3, 9, 307);`);
        // Wha Lee - 4
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 10, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 4, 10, 307);`);
        // Syed Alwee
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 110, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 4, 110, 307);`);
        // Demont - 5
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 12, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 5, 12, 307);`);
        // Polar
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 13, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 5, 13, 307);`);
        // Barker - 6
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 14, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 6, 14, 307);`);
        // Venkatanagappa
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 15, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 6, 15, 307);`);
        // Nguyen-Viet - 7
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 16, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 7, 16, 307);`);
        // Hoffmann
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 17, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 7, 17, 307);`);
        // Baum - 10
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 22, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 10, 22, 307);`);
        // Al-Zubi
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 23, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 10, 23, 307);`);
        // Vanlauwe - 11
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 24, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 11, 24, 307);`);
        // Fadda - 12
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 26, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 12, 26, 307);`);
        // Gebrezgabher
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 145, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 12, 145, 307);`);
        // Boddupalli - 13
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 28, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 13, 28, 307);`);
        // Carvajal Yepes
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 29, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 13, 29, 307);`);
        // Martínez Barón - 14
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 30, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 14, 30, 307);`);
        // Govaerts
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 31, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 14, 31, 307);`);
        // Rossignoli - 15
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 154, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 15, 154, 307);`);
        // Buisson
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 105, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 15, 105, 307);`);
        // Heck - 16
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 34, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 16, 34, 307);`);
        // Alonso
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 35, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 16, 35, 307);`);
        // Baltenweck - 17
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 36, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 17, 36, 307);`);
        // Rekik
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 37, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 17, 37, 307);`);
        // Ole Sander - 18
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 38, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 18, 38, 307);`);
        // Kizito - 19
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 106, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 19, 106, 307);`);
        // Lopez
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 107, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 19, 107, 307);`);
        // J. Krupnik - 20
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 42, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 20, 42, 307);`);
        // Menon
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 43, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 20, 43, 307);`);
        // Jacobs-Mata - 21
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 44, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 21, 44, 307);`);
        // Girvetz
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 45, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 21, 45, 307);`);
        // Arouna - 22
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 177, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 22, 177, 307);`);
        // Loboguerrero - 23
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 48, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 23, 48, 307);`);
        // Hellin
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 49, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 23, 49, 307);`);
        // Wiebe - 24
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 50, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 24, 50, 307);`);
        // Gotor
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 51, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 24, 51, 307);`);
        // Koo - 25
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 52, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 25, 52, 307);`);
        // Gardeazabal
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 188, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 25, 188, 307);`);
        // de Haan - 26
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 54, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 26, 54, 307);`);
        // Gilligan
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 55, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 26, 55, 307);`);
        // Breisinger - 27
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 196, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 27, 196, 307);`);
        // Nicol
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 57, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 27, 57, 307);`);
        // McCartney - 28
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 65, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 28, 65, 307);`);
        // Ringler
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 59, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 28, 59, 307);`);
        // Vos - 29
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 60, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 29, 60, 307);`);
        // Wiegel
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 61, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 29, 61, 307);`);
        // Ruel - 30
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 62, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 30, 62, 307);`);
        // WiLundyegel
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 63, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 30, 63, 307);`);
        // Quintero - 31
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 64, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 31, 64, 307);`);
        // Dickens
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 295, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 31, 295, 307);`);
        // Verchot - 32
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 68, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 32, 68, 307);`);
        // Zhang
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 67, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 32, 67, 307);`);
        // Olney - 33
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 108, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 33, 108, 307);`);
        // Singh
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 109, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 33, 109, 307);`);
        // Ericksen - 34
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 18, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (3, 34, 18, 307);`);
        // Arango
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (2, null, 19, 307);`);
        await queryRunner.query(`INSERT INTO
                                    \`prdb\`.\`role_by_user\` (role, initiative_id, user, created_by)
                                VALUES
                                    (4, 34, 19, 307);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
