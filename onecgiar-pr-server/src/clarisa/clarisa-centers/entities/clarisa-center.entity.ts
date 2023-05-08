import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { ClarisaInstitution } from '../../clarisa-institutions/entities/clarisa-institution.entity';

@Entity('clarisa_center')
export class ClarisaCenter {

    @PrimaryColumn({
        type: 'varchar',
        length: 15,
        name: 'code',
        primary: true,
    })
    code: string;

    @ManyToOne(() => ClarisaInstitution, ci => ci.id)
    @JoinColumn({
        name: 'institutionId'
    })
    institutionId: number;

    @Column({
        name: 'financial_code',
        type: 'text',
        nullable: true
    })
    financial_code: string;

    //-------

}
