import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ClarisaInstitution } from '../../clarisa-institutions/entities/clarisa-institution.entity';

@Entity('clarisa_center')
export class ClarisaCenter {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => ClarisaInstitution, ci => ci.id)
    @JoinColumn({
        name: 'institution_id'
    })
    institution_id: number;

    @Column({
        name: 'financial_code',
        type: 'text',
        nullable: true
    })
    financial_code: string;
}
