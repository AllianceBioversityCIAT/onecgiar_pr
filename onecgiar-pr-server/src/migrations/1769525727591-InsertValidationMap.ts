import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertValidationMap1769525727591 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO validation_maps (display_name, function_name)
            VALUES ('Step 1', 'ipsr_step_one'),('Step 2.1', 'ipsr_step_two_one'),('Step 2.2', 'ipsr_step_two_two'),('Step 3', 'ipsr_step_three'),('Step 4', 'ipsr_step_four');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM validation_maps WHERE display_name IN ('Step 1', 'Step 2.1', 'Step 2.2', 'Step 3', 'Step 4');
        `);
    }

}
