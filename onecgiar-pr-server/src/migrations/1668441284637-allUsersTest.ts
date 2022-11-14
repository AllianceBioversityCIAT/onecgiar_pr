import { MigrationInterface, QueryRunner } from "typeorm"

export class allUsersTest1668441284637 implements MigrationInterface {

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
            4,
            'Michael',
            'Quinn',
            'm.quinn@cgiar.org',
            '$2a$10$MnbXk3CCbDXJ0Zrw9iDT8.SMxSw60qIddOOoFTkzDz4bcgIrtnPd6',
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
            5,
            'Clare',
            'Mukankusi',
            'c.mukankusi@cgiar.org',
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
            6,
            'Inez',
            'Slamet-Loedin',
            'i.slamet-loedin@irri.org',
            '$2a$10$Z6t2zgBCENsalCXY4TuL6eDk3ecpqAMbW7QDpGtlJXa/A8XB7fh8q',
            0
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
            7,
            'Marc',
            'Ghislain',
            'm.ghislain@cgiar.org',
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
            8,
            'Mariana',
            'Yazbek',
            'm.yazbek@cgiar.org',
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
            9,
            'Michael',
            'Abberton',
            'm.abberton@cgiar.org',
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
            10,
            'Young',
            'Wha Lee',
            'y.w.lee@cgiar.org',
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
            11,
            'Augusto',
            'Becerra Lopez-Lavalle',
            'l.a.becerra@cgiar.org',
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
            12,
            'Matty',
            'Demont',
            'm.demont@irri.org',
            '$2a$10$sC1uOZm48/Q0saogIKa42.fT49kH/PS.CLEfvURdneI8JueNFVJbi',
            0
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
            13,
            'Vivian',
            'Polar',
            'v.polar@cgiar.org',
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
            14,
            'Ian',
            'Barker',
            'i.barker@cgiar.org',
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
            15,
            'Shoba',
            'Venkatanagappa',
            's.venkatanagappa@irri.org',
            '$2a$10$rfWdKo3NUvUvmNMPiITkFuHnhXLk0AAwngHkxTWxCgk1R6Wo03n1S',
            0
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
            16,
            'Hung',
            'Nguyen-Viet',
            'h.nguyen@cgiar.org',
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
            17,
            'Vivian',
            'Hoffmann',
            'v.hoffmann@cgiar.org',
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
            18,
            'Polly',
            'Ericksen',
            'p.ericksen@cgiar.org',
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
            19,
            'Jacobo',
            'Arango',
            'j.arango@cgiar.org',
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
            20,
            'Mounir',
            'Louhaichi',
            'm.louhaichi@cgiar.org',
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
            21,
            'Fiona',
            'Flintan',
            'f.flintan@cgiar.org',
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
            22,
            'Michael',
            'Baum',
            'm.baum@cgiar.org',
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
            23,
            'Maha',
            'Al-Zubi',
            'm.al-zubi@cgiar.org',
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
            24,
            'Bernard',
            'Vanlauwe',
            'b.vanlauwe@cgiar.org',
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
            25,
            'Madonna',
            'Casimero',
            'm.casimero@irri.org',
            '$2a$10$KDIWzyyBgJ6YyUZOFBaQDO.QUSAa4u2o2qOpmtYP619cHAZXazGGS',
            0
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
            26,
            'Carlo',
            'Fadda',
            'c.fadda@cgiar.org',
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
            27,
            'Josiane',
            'Nikiema',
            'j.nikiema@cgiar.org',
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
            28,
            'Prasanna',
            'Boddupalli',
            'b.m.prasanna@cgiar.org     ',
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
            29,
            'Monica',
            'Carvajal Yepes',
            'm.carvajal@cgiar.org',
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
            30,
            'Deissy',
            'Martínez Barón',
            'd.m.baron@cgiar.org',
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
            31,
            'Bram',
            'Govaerts',
            'b.govaerts@cgiar.org',
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
            32,
            'Edward',
            'Allison',
            'e.allison@cgiar.org',
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
            33,
            'Sonali',
            'Senaratna Sellamuttu',
            's.senaratnasellamuttu@cgiar.org',
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
            34,
            'Simon',
            'Heck',
            's.heck@cgiar.org',
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
            35,
            'Silvia',
            'Alonso',
            's.alonso@cgiar.org',
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
            36,
            'Isabelle',
            'Baltenweck',
            'i.baltenweck@cgiar.org',
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
            37,
            'Mourad',
            'Rekik',
            'm.rekik@cgiar.org',
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
            38,
            'Bjoern',
            'Ole Sander',
            'b.sander@irri.org',
            '$2a$10$e5NBaG3WcvARKOYe4lD51eyvN4C0wz.X4xktRJIdsbAUhc/Ajgcqa',
            0
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
            39,
            'Shakuntala',
            'Thilsted',
            's.thilsted@cgiar.org',
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
            40,
            'Irmgard',
            'Hoeschle-Zeledon',
            'i.zeledon@cgiar.org',
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
            41,
            'Bruno',
            'Gerard',
            'b.gerard@cgiar.org',
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
            42,
            'Timothy',
            'J. Krupnik',
            't.krupnik@cgiar.org',
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
            43,
            'Purnima',
            'Menon',
            'p.menon@cgiar.org',
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
            44,
            'Inga',
            'Jacobs-Mata',
            'i.jacobs-mata@cgiar.org',
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
            45,
            'Evan',
            'Girvetz',
            'e.girvetz@cgiar.org',
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
            46,
            'Jan',
            'Helsen',
            'j.helsen@cgiar.org',
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
            47,
            'Regina',
            'Kapinga',
            'r.kapinga@cgiar.org',
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
            48,
            'Ana',
            'Maria Loboguerrero',
            'a.m.loboguerrero@cgiar.org',
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
            49,
            'Jon',
            'Hellin',
            'j.hellin@irri.org',
            '$2a$10$guKaE48Cj0DKsnsS/5O11O9PY2HrzOkEEYUWMVKs0KrrMlQYJ3zzK',
            0
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
            50,
            'Keith',
            'Wiebe',
            'k.wiebe@cgiar.org',
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
            51,
            'Elisabetta',
            'Gotor',
            'e.gotor@cgiar.org',
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
            52,
            'Jawoo',
            'Koo',
            'j.koo@cgiar.org',
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
            53,
            'Carolyn',
            'Florey',
            'c.florey@irri.org',
            '$2a$10$OGem84AICUM3.yR7u1nkUOg8yEVCSgYP6sekLOybQyszJWo0WNYEa',
            0
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
            54,
            'Nicoline',
            'de Haan',
            'n.dehaan@cgiar.org',
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
            55,
            'Daniel',
            'Gilligan',
            'd.gilligan@cgiar.org',
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
            56,
            'Jemimah',
            'Njuki',
            'j.njuki@cgiar.org',
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
            57,
            'Alan',
            'Nicol',
            'a.nicol@cgiar.org',
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
            58,
            'Stefan',
            'Uhlenbrook',
            's.uhlenbrook@cgiar.org',
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
            59,
            'Claudia',
            'Ringler',
            'c.ringler@cgiar.org',
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
            60,
            'Rob',
            'Vos',
            'r.vos@cgiar.org',
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
            61,
            'Jenny',
            'Wiegel',
            'j.wiegel@cgiar.org',
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
            62,
            'Marie',
            'Ruel',
            'm.ruel@cgiar.org',
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
            63,
            'Mark',
            'Lundy',
            'm.lundy@cgiar.org',
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
            64,
            'Marcela',
            'Quintero',
            'm.quintero@cgiar.org',
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
            65,
            'Matthew',
            'McCartney',
            'm.mccartney@cgiar.org',
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
            66,
            'Louis',
            'Verchot',
            'l.verchot@cgiar.org',
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
            67,
            'Wei',
            'Zhang',
            'w.zhang@cgiar.org',
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
            68,
            'MARLO',
            'S Admin',
            'marlosadmin@cgiar.org',
            '$2a$10$iMYAE3Os0dNQf0oQ21jpLuSuxp0Zi2Ossv.E8ufX28IEyx6.kX8za',
            0
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
            70,
            'Juan Carlos',
            'Cadavid',
            'jucacar28@hotmail.com',
            '$2a$10$8HJuXaz5LgdLcIjd5eNM2uhzZTqTuSuPL6I9u.E9DqzlnOQURo4RK',
            0
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
            71,
            'Juan Carlos',
            'Cadavid',
            'j.cadavid@cgiar.org',
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
            72,
            'Admin',
            'CGIAR',
            'admin@cgiar.org',
            '$2a$10$cH.zL9nwRwAyarUxBqKKf.on4AFMThMUMkKGtKXKH1qiQjXF1EP.u',
            0
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
            73,
            'Tania',
            'Jordan',
            't.jordan@cgiar.org',
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
            79,
            'Clarisa',
            'Clarisa',
            'clarisa.admin@cgiar.org',
            '$2a$10$5R.nKzrJvq.lujElW.3TU.380moH2L3UFW2fGS9uWDG0Tfku8Zr1q',
            0
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
            80,
            'Iddo',
            'Dror',
            'I.Dror@cgiar.org',
            '',
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
            81,
            'Enrico',
            'Bonaiuti',
            'e.bonaiuti@cgiar.org',
            '',
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
            82,
            'Tonja',
            'Schutz',
            't.schuetz@cgiar.org',
            '',
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
            83,
            'Porscha',
            'Stiger',
            'p.stiger@cgiar.org',
            '',
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
            84,
            'Donald',
            'Menzies',
            'd.menzies@cgiar.org',
            '',
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
            85,
            'Muluhiwot',
            'Getachew',
            'm.getachew@cgiar.org',
            '',
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
            86,
            'David',
            'Abreu',
            'd.abreu@cgiar.org',
            '',
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
            87,
            'Jules',
            'Colomer',
            'J.Colomer@cgiar.org',
            '',
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
            88,
            'Sonja',
            'Vermeulen',
            'S.Vermeulen@cgiar.org',
            '',
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
            89,
            'Marc',
            'Schut',
            'm.schut@cgiar.org',
            '',
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
            90,
            'Nicoleta',
            'Trifa',
            'N.Trifa@cgiar.org',
            '',
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
            91,
            'Juan Sebastian',
            'Ortega',
            'juan.ortega@cgiar.org',
            '',
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
            96,
            'Svetlana',
            'Saakova',
            'svetlana.saakova@cgmel.org',
            '$2a$10$gVsIUYGxwTNGTAPwltrpzuyNMZ1ryDGSo.Rr5gZ4b0iWX9QgspqYy',
            0
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
            98,
            'Moayad',
            'Al-Najdawi',
            'moayad@codeobia.com',
            '$2a$10$oh94/n84FLS.wghN2g9TZu69EWZRVc5ibL3rStQuZXHH0GOTbyENG',
            0
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
            99,
            'Jose',
            'Morales',
            'j.m.morales@cgiar.org',
            '',
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
            100,
            'Claudia',
            'Cipriani',
            'C.Cipriani@cgiar.org',
            '',
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
            101,
            'Laura',
            'Becker',
            'laura.becker@cgmel.org',
            '$2a$10$rVWrnuShjdpyQQRCz.fAI.j46bmQzjpz/8x9C1NWfZUFHcOrJnFku',
            0
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
            102,
            'Diego',
            'Perez',
            'd.f.perez@cgiar.org',
            '',
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
            103,
            'Graphileon',
            'Admin',
            'graphileon@cgiar.org',
            '$2a$10$HggPvE5R1qaTe4ye9MMudeAXPXFtkPmHD1Z2d7y031BABxbX6fwwG',
            0
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
            105,
            'Marie-Charlotte',
            'Buisson',
            'M.Buisson@cgiar.org',
            NULL,
            0
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
            106,
            'Fred',
            'Kizito',
            'f.kizito@cgiar.org',
            NULL,
            0
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
            107,
            'Santiago',
            'Lopez',
            's.l.ridaura@cgiar.org',
            NULL,
            0
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
            108,
            'Deanna',
            'Olney',
            'd.olney@cgiar.org',
            NULL,
            0
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
            109,
            'Ravi Gopal',
            'Singh',
            'r.g.singh@cgiar.org',
            NULL,
            0
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
            110,
            'Sharifah Shahrul',
            'Syed Alwee',
            's.syedalwee@irri.org',
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
            111,
            'Toc',
            'Admin',
            'tocadmin@cgiar.org',
            '$2a$10$rTac2Gx8.PU/5pCGe5m9tuw.ZMOyxYA6KsK8.NdyChvyAelG.slo2',
            0
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
            112,
            'User',
            'Test',
            'usertest@test.com',
            '$2a$10$qr2wVjFuwpY98C/togmW6.cd5iYO6Tl9tc9kRZdcDMD5otuBvTHEC',
            0
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
            113,
            'Alessandra',
            'Furtado',
            'A.Furtado@cgiar.org',
            '$2a$10$3qT7mTNt8yFOC9S7M6yW/u2bfaasm9c3lkLD0E6g1lcZg7gOPyFwi',
            0
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
            114,
            'Daniel',
            'Alberts',
            'D.Alberts@cgiar.org',
            '',
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
            115,
            'Manuel',
            'Almanzar',
            'M.R.Almanzar@cgiar.org',
            '',
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
            116,
            'Sandrine',
            'Olivencia',
            'sandrineolivencia@gmail.com',
            '$2a$10$bBGLuJdK6wmW8WjdrmkzWO8WJGSQqRdqipBgPg84wnbk0ynofhUFi',
            0
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
            117,
            'Santiago',
            'Galvez',
            's.galvez@cgiar.org',
            '',
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
            118,
            'Nobert',
            'Mumo',
            'n.mumongungu@cgiar.org',
            '',
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
            119,
            'David Felipe',
            'Casañas',
            'D.Casanas@cgiar.org',
            '',
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
            120,
            'Support',
            'Dev',
            'support@gmail.com',
            '$2a$10$n95vY4M6H8NpTVkonenFieqQZb96.oXzInNK7oCnvjnE5fGjq0LKO',
            0
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
            121,
            'Rodrigo',
            'Ortiz',
            'R.A.Ortiz@cgiar.org',
            '',
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
            122,
            'Charlotte',
            'Lusty',
            'c.lusty@cgiar.org',
            '',
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
            123,
            'Michael',
            'Halewood',
            'm.halewood@cgiar.org',
            '',
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
            124,
            'Lava',
            'Kumar',
            'l.kumar@cgiar.org',
            '',
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
            125,
            'Jason',
            'Donovan',
            'j.donovan@cgiar.org',
            '',
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
            126,
            'Berber',
            'Kramer',
            'b.kramer@cgiar.org',
            '',
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
            127,
            'Vish',
            'Banda',
            'v.banda@cgiar.org',
            '',
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
            128,
            'Bentley',
            'Alison',
            'a.bentley@cgiar.org',
            '',
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
            130,
            'jean-claude',
            'Rubyogo',
            'j.c.rubyogo@cgiar.org',
            '',
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
            131,
            'omoigui',
            'lucky',
            'l.omoigui@cgiar.org',
            '',
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
            132,
            'legg',
            'james',
            'j.legg@cgiar.org',
            '',
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
            133,
            'mcewan',
            'margaret',
            'm.mcewan@cgiar.org',
            '',
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
            134,
            'gatto',
            'marcel',
            'm.gatto@cgiar.org',
            '',
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
            135,
            'spielman',
            'david',
            'd.spielman@cgiar.org',
            '',
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
            138,
            'zamudio',
            'julia',
            'j.zamudio@cgiar.org',
            '',
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
            139,
            'Wacera',
            'Ndonga',
            'W.Ndonga@cgiar.org',
            '',
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
            140,
            'Rhiannon ',
            'Crichton',
            'r.crichton@cgiar.org',
            '',
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
            141,
            'Medha',
            'Devare',
            'm.devare@cgiar.org',
            '',
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
            142,
            'Manlda',
            'Nkomo',
            'm.nkomo@cgiar.org',
            '',
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
            143,
            'Theresa',
            'Ampadu-Boakye',
            't.ampadu-boakye@cgiar.org',
            '',
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
            144,
            'Sieglinde ',
            'Snapp',
            's.snapp@cgiar.org',
            '',
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
            145,
            'Solomie',
            'Gebrezgabher',
            's.Gebrezgabher@cgiar.org',
            '',
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
            146,
            'Claire',
            'Vukcevic',
            'c.vukcevic@cgiar.org',
            '',
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
            147,
            'Alejandro',
            'Ortega-Beltran',
            'A.Beltran@cgiar.org',
            '',
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
            148,
            'Nozomi',
            'Kawarazuka',
            'N.Kawarazuka@cgiar.org',
            '',
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
            149,
            'Yanyan',
            'Liu',
            'Y.Liu@cgiar.org',
            '',
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
            150,
            'Carolina',
            'Gonzalez',
            'c.gonzalez@cgiar.org',
            '',
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
            151,
            'Andrea ',
            'Castellanos',
            'a.e.castellanos@cgiar.org',
            '',
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
            152,
            'Mercedes ',
            'Perez',
            'M.PEREZ@cgiar.org',
            '',
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
            153,
            'Khalil ',
            'Anar',
            'A.Khalil@cgiar.org',
            '',
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
            154,
            'Rossignoli ',
            'Cristiano',
            'C.Rossignoli@cgiar.org',
            '',
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
            155,
            'Benzie',
            'John',
            'J.Benzie@cgiar.org',
            '',
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
            156,
            'Eriksson',
            'Hampus',
            'H.Eriksson@cgiar.org',
            '',
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
            157,
            'Cherry',
            'Kek',
            'SH.Kek@cgiar.org',
            '',
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
            158,
            'Adam',
            'Rahma',
            'R.Adam@cgiar.org',
            '',
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
            159,
            'TAn',
            'Ban Swee',
            'b.tan@CGIAR.ORG',
            '',
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
            160,
            'Danny',
            'Coyne',
            'd.coyne@cgiar.org',
            '',
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
            161,
            'Pay',
            'Drechsel',
            'p.drechsel@cgiar.org',
            '',
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
            162,
            'Gordon',
            'Prain',
            'g.prain@cgiar.org',
            '',
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
            163,
            'Helen',
            'Altshul',
            'h.altshul@cgiar.org',
            '',
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
            164,
            'Jane',
            'Poole',
            'j.poole@cgiar.org',
            '',
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
            165,
            'Karen',
            'Marshall',
            'K.Marshall@cgiar.org',
            '',
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
            166,
            'Stefan',
            'Burkart',
            'S.Burkart@CGIAR.ORG',
            '',
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
            167,
            'Nils',
            'Teufel',
            'n.teufel@cgiar.org',
            '',
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
            168,
            'Benjamin ',
            'Belton',
            'b.belton@cgiar.org',
            '',
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
            171,
            'Hope',
            'Webber',
            'ho.webber@cgiar.org',
            '',
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
            172,
            'Christian',
            'Thierfelder',
            'c.thierfelder@cgiar.org',
            '',
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
            173,
            'Mercy',
            'Zulu',
            'Mercy.Zulu@cgiar.org',
            '',
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
            174,
            'Hauke',
            'Dahl',
            'h.dahl@cgiar.org',
            '',
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
            175,
            'Deepa',
            'Joshi',
            'deepa.joshi@cgiar.org',
            '',
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
            176,
            'Everisto',
            'Mapedza',
            'e.mapedza@cgiar.org',
            '',
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
            177,
            'Aminou',
            'Arouna',
            'a.arouna@cgiar.org',
            '',
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
            178,
            'Robert',
            'Asiedu',
            'r.asiedu@cgiar.org',
            '',
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
            179,
            'Peter',
            'Laderach',
            'p.laderach@cgiar.org',
            '',
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
            180,
            'Tafadzwanashe',
            'Mabhaudi',
            't.mabhaudhi@cgiar.org',
            '',
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
            181,
            'Aline',
            'Mugisho',
            'a.mugisho@cgiar.org',
            '',
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
            182,
            'Lateef',
            'Sanni',
            'l.sanni@cgiar.org',
            '',
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
            183,
            'Jan',
            'Low',
            'j.low@cgiar.org',
            '',
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
            184,
            'Murat',
            'Sartas',
            'm.sartas@cgiar.org',
            '',
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
            185,
            'Sabrina',
            'Rose',
            's.rose@cgiar.org',
            '',
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
            186,
            'Lina',
            'Valencia',
            'l.valencia@cgiar.org',
            '',
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
            187,
            'Rowena',
            'Valmonte-Santos',
            'r.valmonte-santos@cgiar.org',
            '',
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
            188,
            'Andrea',
            'Gardeazabal',
            'a.gardeazabal@cgiar.org',
            '',
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
            189,
            'Simon',
            'Langan',
            's.langan@cgiar.org',
            '',
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
            190,
            'Daniel',
            'Jimenez',
            'd.jimenez@cgiar.org',
            '',
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
            191,
            'Sheetal',
            'Sharma',
            's.sharma@cgiar.org',
            '',
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
            192,
            'Steven',
            'Cole',
            's.cole@cgiar.org',
            '',
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
            193,
            'Shalini',
            'Roy',
            's.roy@cgiar.org',
            '',
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
            194,
            'Katrina',
            'Kosec',
            'k.kosec@cgiar.org',
            '',
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
            196,
            'Clemens',
            'Breisinger',
            'c.breisinger@cgiar.org',
            '',
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
            197,
            'Yumna ',
            'Kassim',
            'y.kassim@cgiar.org',
            '',
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
            198,
            'Emma ',
            'Greatrix',
            'e.greatrix@cgiar.org',
            '',
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
            199,
            'Mohsin ',
            'Hafeez',
            'm.hafeez@cgiar.org',
            '',
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
            200,
            'Jonathan ',
            'Lautze',
            'j.lautze@cgiar.org',
            '',
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
            201,
            'Ruth ',
            'meinzen',
            'r.meinzen-dick@cgiar.org',
            '',
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
            202,
            'Elias',
            'Marlene ',
            'marlene.elias@cgiar.org',
            '',
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
            203,
            'Nicholas',
            'Minot',
            'n.minot@cgiar.org',
            '',
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
            204,
            'Katherine',
            'Ambler',
            'k.ambler@cgiar.org',
            '',
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
            205,
            'Thai',
            'Minh',
            't.minh@cgiar.org',
            '',
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
            206,
            'Amanda ',
            'Wyatt',
            'a.wyatt@cgiar.org',
            '',
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
            207,
            'Gabriela ',
            'Wiederkehr',
            'g.wiederkehr@cgiar.org',
            '',
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
            208,
            'Simone',
            'Staiger',
            's.staiger@cgiar.org',
            '',
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
            209,
            'Pascale',
            'Sabbagh',
            'p.sabbagh@cgiar.org',
            '',
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
            210,
            'Sara ',
            'Shapleigh',
            's.shapleigh@cgiar.org',
            '',
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
            211,
            'kabugi',
            'assenath',
            'a.kabugi@cgiar.org',
            '',
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
            212,
            'Gustavo',
            'Teixeira',
            'g.teixeira@cgiar.org',
            '',
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
            213,
            'Eng Hwa',
            'Ng',
            'N.Enghwa@cgiar.org',
            '',
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
            214,
            'Andre',
            'Moretto',
            'a.moretto@cgiar.org',
            '',
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
            215,
            'Adriana',
            'Gonzalez',
            'v.gonzalez@cgiar.org',
            '',
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
            222,
            'Puskur',
            'ranjitha',
            'r.puskur@irri.org',
            '$2a$10$jW8Av2kDhJNSoM/PhtbDNegKIzaSpqmE.V4RAbcbbJVEfF2rcm1kC',
            0
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
            224,
            'Nayak',
            'Swati',
            's.nayak@irri.org',
            '$2a$10$2mPg5AzPxzNkUyb8f2L7meCtWA2iYu1Fjpkr1J58Y3wSzUbUKTdCu',
            0
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
            225,
            'Vina',
            'Alvarez',
            'v.alvarez@irri.org',
            '$2a$10$dY/Q1u2S4SsMtdWpi9z.l.I5sT.ZWmb/HPhs660IThlFaAbwDqXFO',
            0
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
            226,
            'Melinda',
            'Limlengco',
            'm.limlengco@irri.org',
            '$2a$10$q2Z42VqS8kjLiA4tPUA20.yBVv/PRlceTVmM5XmxA0FQnNERsdRmS',
            0
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
            227,
            'Eisen',
            'Bernardo',
            'e.bernardo@irri.org',
            '$2a$10$PuKhefQ/q4eJnISJxM1WWuhxkM5ItgqCEPiPSGrVL3AHihFbk8Wia',
            0
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
            228,
            'Charlotte',
            'Lusty',
            'charlotte.lusty@croptrust.org',
            '$2a$10$E0AkUoHAkoJ7LNIkb..djuhNiRmtGn63xij2TuArJW79Leri4nSqy',
            0
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
            231,
            'Prakashan ',
            'Chellattan Veettil',
            'p.chellattanveettil@irri.org',
            '',
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
            232,
            'Mangi Lal',
            'Jat',
            'M.Jat@cgiar.org',
            '',
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
            233,
            'Anton',
            'URFELS',
            'A.URFELS@cgiar.org',
            '',
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
            234,
            'Aditi',
            'Mukherji',
            'A.Mukherji@cgiar.org',
            '',
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
            235,
            'Stephanie',
            'CHEESMAN',
            'S.CHEESMAN@cgiar.org',
            '',
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
            236,
            'Cynthia Shazel',
            'CARMONA REYES',
            'C.Carmona@cgiar.org',
            '',
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
            237,
            'Avinash',
            'Kishore',
            'A.Kishore@cgiar.org',
            '',
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
            238,
            'Tharayil Shereef',
            'AMJATH BABU',
            'T.AMJATH@cgiar.org',
            '',
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
            239,
            'Joe Edward',
            'Dale',
            'J.DALE@cgiar.org',
            '',
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
            240,
            'Samarendu',
            'Mohanty',
            's.mohanty@cgiar.org',
            '',
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
            241,
            'PC',
            'Veettil',
            'pc.veettil@irri.org',
            '',
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
            243,
            'Emelyn',
            'Go',
            'emelyn.go@cgiar.org',
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
            245,
            'Liangzhi',
            'You',
            'l.you@cgiar.org',
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
            247,
            'Grazia',
            'Pacillo',
            'g.pacillo@cgiar.org',
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
            248,
            'Giriraj',
            'Amarnath',
            'a.giriraj@cgiar.org',
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
            249,
            'Ajit',
            'Govind',
            'a.govind@cgiar.org',
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
            250,
            'Andy',
            'Challinor',
            'a.j.challinor@leeds.ac.uk',
            '$2a$10$8eCdFkbAnDAymDiutVDDuefxNkbbgfPfkJKff2oNN5lL2cQqyRm7O',
            0
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
            251,
            'Enoch',
            'Kikulwe',
            'e.kikulwe@cgiar.org',
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
            252,
            'Cinzia Melania',
            'Russo',
            'c.russo@cgiar.org',
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
            253,
            'Isabel',
            'Lopez Noriega',
            'i.lopez@cgiar.org',
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
            254,
            'Allison',
            'Poulos',
            'a.poulos@cgiar.org',
            '',
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
            255,
            'Nick',
            'Davis',
            'n.davis@cgiar.org',
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
            256,
            'Nicolas',
            'Roux',
            'n.roux@cgiar.org',
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
            257,
            'Byron',
            'Reyes',
            'b.reyes@cgiar.org',
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
            258,
            'Francisco',
            'Armenta',
            'f.armenta@cgiar.org',
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
            259,
            'Arshnee',
            'Moodley',
            'a.moodley@cgiar.org',
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
            260,
            'Javier',
            'Mateo-Sagasta',
            'j.mateo-sagasta@cgiar.org',
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
            261,
            'Bernard',
            'Bett',
            'b.bett@cgiar.org',
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
            262,
            'Vishnumurthy Mohan',
            'Chadag',
            'V.Chadag@cgiar.org',
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
            263,
            'Eric',
            'Fevre',
            'Eric.Fevre@liverpool.ac.uk',
            '$2a$10$oA7ovP8n/hfXNVq/mi7nduHUdlPEjQHIP9QeN9pJ9y/r6MDOjcw4G',
            0
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
            264,
            'Megi',
            'Culhaj',
            'm.cullhaj@cgiar.org',
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
            265,
            'Alice',
            'Njehu',
            'a.njehu@cgiar.org',
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
            266,
            'Bhim',
            'Reddy',
            'bhim.reddy@irri.org',
            '$2a$10$92FtQSyT0It.0biO4dRLnOicA1/t2qSir07ZjEHlYe25tDbKgOb0i',
            0
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
            267,
            'Steve',
            'Lam',
            'lams@uoguelph.ca',
            '$2a$10$jXxc8gJAcS46sPvCersomO3aOf10B3DjWcWHQKrMpPk72SYj1Aaea',
            0
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
            268,
            'Abdurahman Beshir',
            'ISSA',
            'a.issa@cgiar.org',
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
            269,
            'Adefris',
            'TEKLEWOLD',
            'a.teklewold@cgiar.org',
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
            270,
            'Innocent',
            'Bikara',
            'i.bikara@cgiar.org',
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
            271,
            'Nathalie',
            'Vignaux',
            'Nathalie.Vignaux-1@syngenta.com',
            '$2a$10$w8bUGSsK13ZLKEO0GSLjIeK82hmp/29TH57T7culCX13nmLx.4rPu',
            0
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
            272,
            'Chinyere',
            'Obilo',
            'C.Obilo@cgiar.org',
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
            273,
            'Tesfamichael',
            'Wossen',
            'T.Wossen@cgiar.org',
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
            274,
            'Neha',
            'Durga',
            'n.durga@cgiar.org',
            '$2a$08$Gv7vpp.uBrDaPwj2EB7iMe1hPnR1dBqpML1R3/VkyK6RyhaJyb9zy',
            0
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
            276,
            'Tiziana',
            'Pagnani',
            't.pagnani@cgiar.org',
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
            278,
            'Adam',
            'Kennedy',
            'A.Kennedy@cgiar.org',
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
            279,
            'Fiona',
            'Hay',
            'fiona.hay@agro.au.dk',
            '$2a$10$rWJtnPDpnYRwVwsB.mbx1ej27wctpq0IovQC5GC8Td8BpcQlRIddm',
            0
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
            280,
            'Marianne',
            'Banziger',
            'mariannebanziger@outlook.com',
            '$2a$10$QRbyOqPa6JswpCLliPDqpuNSjwkMziseyPWOFOCHHHM.im85DzxxS',
            0
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
            281,
            'Maria',
            'Atoui',
            'M.Atoui@cgiar.org',
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
            282,
            'Ivana',
            'Cortesini',
            'I.Cortesini@cgiar.org',
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
            283,
            'Margarita',
            'Ramírez',
            'margarita.ramirez@cgiar.org',
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
            284,
            'Mathieu',
            'Ouedraogo',
            'm.ouedraogo@cgiar.org',
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
            285,
            'Diane',
            'Stafford',
            'dianemarystafford@gmail.com',
            '$2a$10$DAgK0my0ozthaiin9itYFu1IZ.n0g9IGnony898qduOsnsOKkxxMK',
            0
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
            286,
            'Atilade Solomon',
            'Adebayo',
            'a.adebayo@cgiar.org',
            '',
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
            287,
            'Maria Fernanda',
            'Cataño Mora',
            'm.catano@cgiar.org',
            '',
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
            288,
            'Marissa',
            'Van Epp',
            'M.VanEpp@cgiar.org',
            '',
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
            289,
            'Manisha',
            'Shrestha',
            'manisha.shrestha@cgiar.org',
            '',
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
            294,
            'German',
            'Martinez',
            'G.Martinez@cgiar.org',
            '',
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
            295,
            'Chris',
            'Dickens',
            'c.dickens@cgiar.org',
            '',
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
            296,
            'Alan',
            'de Brauw',
            'a.debrauw@cgiar.org',
            '',
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
            297,
            'Yuji',
            'Enriquez',
            'y.enriquez@irri.org',
            '$2a$10$u.V5NZhWAtG7DUatVKaLWO5I6c.BGMqTQbokNtW9BFMTzX5/LySq2',
            0
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
            298,
            'Valerien',
            'Pede',
            'v.pede@irri.org',
            '$2a$10$DpSe3DxGC.7pfD3v7tQV4eq1JSSMUMp/VJ5jyevePK1FZHYTp4Ufu',
            0
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
            299,
            'Catharine',
            'Adaro',
            'c.adaro@cgiar.org',
            '',
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
            300,
            'AKM Saiful',
            'ISLAM',
            'a.s.islam@cgiar.org',
            '',
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
            301,
            'Eleonora',
            'De Falcis',
            'e.defalcis@cgiar.org',
            '',
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
            302,
            'Asma',
            'Jeitani',
            'a.jeitani@cgiar.org',
            '',
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
            303,
            'Neena',
            'Jacob',
            'n.jacob@cgiar.org',
            '',
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
            304,
            'Todd',
            'Crane',
            't.crane@cgiar.org',
            '',
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
            305,
            'Issa',
            'Ouedregao',
            'i.ouedraogo@cgiar.org',
            '',
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
            306,
            'Todd',
            'Rosenstock',
            't.rosenstock@cgiar.org',
            '',
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
            307,
            'Juan David',
            'Delgado',
            'j.delgado@cgiar.org',
            '',
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
            308,
            'Laura',
            'Chaves',
            'l.chaves@cgiar.org',
            '',
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
            311,
            'Sandra',
            'Vargas',
            's.m.vargas@cgiar.org',
            '',
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
            312,
            'Jake',
            'Carampatana',
            'j.carampatana@cgiar.org',
            '',
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
            313,
            'Collins',
            'Ageyo',
            'c.ageyo@cgiar.org',
            '',
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
            314,
            'Karen Valeria',
            'Camilo',
            'K.Camilo@cgiar.org',
            '',
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
            315,
            'Joy',
            'Chiagoziem',
            'j.chiagoziem@cgiar.org',
            '',
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
            316,
            'Daniel William',
            'Mgalla',
            'd.mgalla@cgiar.org',
            '',
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
            317,
            'Benedict',
            'Boyubie',
            'b.boyubie@cgiar.org',
            '',
            1
        );`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
