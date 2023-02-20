import { MigrationInterface, QueryRunner } from "typeorm";

export class clarisaRegionsCGIAR1676663009356 implements MigrationInterface {
    name = 'clarisaRegionsCGIAR1676663009356'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`clarisa_regions_cgiar\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`un_code\` bigint NOT NULL, \`un_name\` text NOT NULL, \`cgiar_code\` bigint NOT NULL, \`cgiar_name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`INSERT INTO
                clarisa_regions_cgiar (un_code, un_name, cgiar_code, cgiar_name)
            VALUES
                (
                    15,
                    'Northern Africa',
                    1,
                    'Central and West Asia and North Africa'
                ),
                (
                    14,
                    'Eastern Africa',
                    4,
                    'East and Southern Africa'
                ),
                (
                    17,
                    'Middle Africa',
                    4,
                    'East and Southern Africa'
                ),
                (
                    18,
                    'Southern Africa',
                    4,
                    'East and Southern Africa'
                ),
                (
                    11,
                    'Western Africa',
                    3,
                    'West and Central Africa'
                ),
                (
                    143,
                    'Central Asia',
                    1,
                    'Central and West Asia and North Africa'
                ),
                (
                    30,
                    'Eastern Asia',
                    6,
                    'Southeast Asia and Pacific'
                ),
                (34, 'Southern Asia', 5, 'South Asia'),
                (
                    35,
                    'South-Eastern Asia',
                    6,
                    'Southeast Asia and Pacific'
                ),
                (
                    145,
                    'Western Asia',
                    1,
                    'Central and West Asia and North Africa'
                ),
                (
                    419,
                    'Latin America and the Caribbean',
                    2,
                    'Latin America and the Caribbean'
                ),
                (
                    29,
                    'Caribbean',
                    2,
                    'Latin America and the Caribbean'
                ),
                (
                    13,
                    'Central America',
                    2,
                    'Latin America and the Caribbean'
                ),
                (
                    5,
                    'South America',
                    2,
                    'Latin America and the Caribbean'
                ),
                (21, 'Northern America', 8, 'North America'),
                (150, 'Europe', 7, 'Europe'),
                (154, 'Northern Europe', 7, 'Europe'),
                (151, 'Eastern Europe', 7, 'Europe'),
                (155, 'Western Europe', 7, 'Europe'),
                (39, 'Southern Europe', 7, 'Europe'),
                (9, 'Oceania', 6, 'Southeast Asia and Pacific'),
                (
                    53,
                    'Australia and New Zealand',
                    6,
                    'Southeast Asia and Pacific'
                ),
                (54, 'Melanesia', 6, 'Southeast Asia and Pacific'),
                (
                    57,
                    'Micronesia',
                    6,
                    'Southeast Asia and Pacific'
                ),
                (61, 'Polynesia', 6, 'Southeast Asia and Pacific');`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
