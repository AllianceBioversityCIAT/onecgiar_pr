import { MigrationInterface, QueryRunner } from "typeorm"

export class genderTagData1666187001104 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`DELETE FROM \`gender_tag_level\``);
        await queryRunner.query(`DELETE FROM \`institution_role\``);

        await queryRunner.query(`ALTER TABLE \`gender_tag_level\` AUTO_INCREMENT = 1`);
        await queryRunner.query(`ALTER TABLE \`institution_role\` AUTO_INCREMENT = 1`);

        await queryRunner.query(
            `INSERT INTO \`gender_tag_level\` (title, description) VALUES ('Not Targeted', NULL)`,
        );
        await queryRunner.query(
            `INSERT INTO \`gender_tag_level\` (title, description) VALUES ('Significant', NULL)`,
        );
        await queryRunner.query(
            `INSERT INTO \`gender_tag_level\` (title, description) VALUES ('Principal', NULL)`,
        );

        await queryRunner.query(
            `INSERT INTO \`institution_role\` (name) VALUES ('Actor')`,
        );
        await queryRunner.query(
            `INSERT INTO \`institution_role\` (name) VALUES ('Partner')`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
