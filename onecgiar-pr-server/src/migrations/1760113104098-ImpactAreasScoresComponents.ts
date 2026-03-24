import { MigrationInterface, QueryRunner } from "typeorm";

export class ImpactAreasScoresComponents1760113104098 implements MigrationInterface {
    name = 'ImpactAreasScoresComponents1760113104098';

    public async up(queryRunner: QueryRunner): Promise<void> {

        // Crear la tabla
        await queryRunner.query(`
            CREATE TABLE \`impact_areas_scores_components\` (
                \`id\` bigint NOT NULL AUTO_INCREMENT,
                \`name\` text NOT NULL,
                \`impact_area\` text NULL,
                \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`is_active\` tinyint NOT NULL DEFAULT 1,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // Insertar los valores iniciales
        await queryRunner.query(`
            INSERT INTO \`impact_areas_scores_components\` (\`name\`, \`impact_area\`)
            VALUES 
                ('Gender equality', 'Gender'),
                ('Youth', 'Gender'),
                ('Social Inclusion', 'Gender'),

                ('Adaptation', 'Climate'),
                ('Mitigation', 'Climate'),

                ('Nutrition', 'Nutrition'),
                ('Health', 'Nutrition'),
                ('Food Security', 'Nutrition'),

                ('Environmental health', 'Environmental'),
                ('Biodiversity', 'Environmental'),

                ('Poverty Reduction', 'Poverty'),
                ('Livelihoods', 'Poverty'),
                ('Jobs', 'Poverty');
        `);

        // Agregar las columnas y llaves foráneas en la tabla result
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`gender_impact_area_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`climate_impact_area_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`nutrition_impact_area_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`environmental_biodiversity_impact_area_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`poverty_impact_area_id\` bigint NULL`);

        await queryRunner.query(`
            ALTER TABLE \`result\`
            ADD CONSTRAINT \`FK_b875aa791af8be05c64654f4a08\`
            FOREIGN KEY (\`gender_impact_area_id\`)
            REFERENCES \`impact_areas_scores_components\`(\`id\`)
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE \`result\`
            ADD CONSTRAINT \`FK_1af72f9b39231f2d975eee39c73\`
            FOREIGN KEY (\`climate_impact_area_id\`)
            REFERENCES \`impact_areas_scores_components\`(\`id\`)
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE \`result\`
            ADD CONSTRAINT \`FK_8b1967fa765dde5e94505ad6307\`
            FOREIGN KEY (\`nutrition_impact_area_id\`)
            REFERENCES \`impact_areas_scores_components\`(\`id\`)
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE \`result\`
            ADD CONSTRAINT \`FK_131905456523d0e993a4c392328\`
            FOREIGN KEY (\`environmental_biodiversity_impact_area_id\`)
            REFERENCES \`impact_areas_scores_components\`(\`id\`)
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE \`result\`
            ADD CONSTRAINT \`FK_e7324c677c4fcd56323be6cf97b\`
            FOREIGN KEY (\`poverty_impact_area_id\`)
            REFERENCES \`impact_areas_scores_components\`(\`id\`)
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_e7324c677c4fcd56323be6cf97b\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_131905456523d0e993a4c392328\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_8b1967fa765dde5e94505ad6307\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_1af72f9b39231f2d975eee39c73\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_b875aa791af8be05c64654f4a08\``);

        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`poverty_impact_area_id\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`environmental_biodiversity_impact_area_id\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`nutrition_impact_area_id\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`climate_impact_area_id\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`gender_impact_area_id\``);

        await queryRunner.query(`DROP TABLE \`impact_areas_scores_components\``);
    }
}
