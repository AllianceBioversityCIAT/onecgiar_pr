import { PrimaryGeneratedColumn, Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { BaseBudget } from './base-budget';

@Entity('result_initiative_budget')
export class ResultInitiativeBudget extends BaseEntity{
    @PrimaryGeneratedColumn({
        name: 'result_initiative_budget_id',
        type: 'bigint'
    })
    result_initiative_budget_id: number;

    @Column({
        name: 'result_initiative_id',
        type: 'bigint',
        nullable: false
    })
    result_initiative_id: number;

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
