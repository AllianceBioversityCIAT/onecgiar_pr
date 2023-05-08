import { MigrationInterface, QueryRunner } from "typeorm"

export class insertActorsType1679588387039 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO actor_type (name) VALUES ('Farmers/ (agro)pastoralist/ herders/ fishers'), ('Researchers'), ('Extension agents'), ('Policy actors (public or private)'), ('Other')`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
