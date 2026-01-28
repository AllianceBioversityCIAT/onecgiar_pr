import { MigrationInterface, QueryRunner } from "typeorm";

export class AuditoryTableUpdatebilateralResult1769613831423 implements MigrationInterface {
    name = 'AuditoryTableUpdatebilateralResult1769613831423'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Primero actualizar los datos existentes para que coincidan con los nuevos valores del enum
        await queryRunner.query(`UPDATE \`result_review_history\` SET \`action\` = 'APPROVED' WHERE \`action\` = 'APPROVE'`);
        await queryRunner.query(`UPDATE \`result_review_history\` SET \`action\` = 'REJECTED' WHERE \`action\` = 'REJECT'`);
        
        // Luego cambiar el enum para incluir los nuevos valores
        await queryRunner.query(`ALTER TABLE \`result_review_history\` CHANGE \`action\` \`action\` enum ('APPROVED', 'REJECTED', 'UPDATE') NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Primero actualizar los datos existentes de vuelta a los valores antiguos
        await queryRunner.query(`UPDATE \`result_review_history\` SET \`action\` = 'APPROVE' WHERE \`action\` = 'APPROVED'`);
        await queryRunner.query(`UPDATE \`result_review_history\` SET \`action\` = 'REJECT' WHERE \`action\` = 'REJECTED'`);
        // Eliminar registros con 'UPDATE' ya que no existe en el enum antiguo
        await queryRunner.query(`DELETE FROM \`result_review_history\` WHERE \`action\` = 'UPDATE'`);
        
        // Luego cambiar el enum de vuelta
        await queryRunner.query(`ALTER TABLE \`result_review_history\` CHANGE \`action\` \`action\` enum ('APPROVE', 'REJECT') NOT NULL`);
    }

}
