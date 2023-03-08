import { MigrationInterface, QueryRunner } from "typeorm";

export class createIpsrRole1678308539031 implements MigrationInterface {
    name = 'createIpsrRole1678308539031'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`ipsr_role\` (\`ipsr_role_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NULL, PRIMARY KEY (\`ipsr_role_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`innovation_by_result\` ADD \`ipsr_role_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`innovation_by_result\` ADD CONSTRAINT \`FK_318abca8e58476319f6e9a6c2b8\` FOREIGN KEY (\`ipsr_role_id\`) REFERENCES \`ipsr_role\`(\`ipsr_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`INSERT INTO \`ipsr_role\` (\`name\`) VALUES ('Core innovation'),('Complementary innovation')`);
    
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`innovation_by_result\` DROP FOREIGN KEY \`FK_318abca8e58476319f6e9a6c2b8\``);
        await queryRunner.query(`ALTER TABLE \`innovation_by_result\` DROP COLUMN \`ipsr_role_id\``);
        await queryRunner.query(`DROP TABLE \`ipsr_role\``);
    }

}
