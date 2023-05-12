import { MigrationInterface, QueryRunner } from "typeorm";

export class complementaryInnovationEnablerTypeModificationColumn1683903599339 implements MigrationInterface {
    name = 'complementaryInnovationEnablerTypeModificationColumn1683903599339'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`complementary_innovation_enabler_types\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`complementary_innovation_enabler_types\` ADD \`type\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`complementary_innovation_enabler_types\` ADD CONSTRAINT \`FK_a53d247027817e218ae803c6d81\` FOREIGN KEY (\`type\`) REFERENCES \`complementary_innovation_enabler_types\`(\`complementary_innovation_enabler_types_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`complementary_innovation_enabler_types\` DROP FOREIGN KEY \`FK_a53d247027817e218ae803c6d81\``);
        await queryRunner.query(`ALTER TABLE \`complementary_innovation_enabler_types\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`complementary_innovation_enabler_types\` ADD \`type\` text NULL`);
    }

}
