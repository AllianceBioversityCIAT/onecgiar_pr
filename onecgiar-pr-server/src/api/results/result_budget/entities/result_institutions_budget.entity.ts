import { PrimaryGeneratedColumn, Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('result_institutions_budget')
export class ResultInstitutionsBudget extends BaseEntity{
    @PrimaryGeneratedColumn({
        name: 'result_institutions_budget_id',
        type: 'bigint'
    })
    result_institutions_budget_id: number;

    @Column({
        name: 'result_institution_id',
        type: 'bigint',
        nullable: false
    })
    result_institution_id: number;

    @Column({
        name: 'current_year',
        type: 'bigint',
        nullable: true
    })
    current_year!: number;

    @Column({
        name: 'next_year',
        type: 'bigint',
        nullable: true
    })
    next_year!: number;

    @Column({
        name: 'is_determined',
        type: 'boolean',
        nullable: true
    })
    is_determined!: boolean;


}
