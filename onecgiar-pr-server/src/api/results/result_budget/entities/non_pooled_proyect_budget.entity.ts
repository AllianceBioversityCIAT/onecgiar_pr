import { PrimaryGeneratedColumn, Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { NonPooledProject } from '../../non-pooled-projects/entities/non-pooled-project.entity';
import { Version } from '../../versions/entities/version.entity';

@Entity('non_pooled_projetct_budget')
export class NonPooledProjectBudget extends BaseEntity{
    @PrimaryGeneratedColumn({
        name: 'non_pooled_projetct_budget_id',
        type: 'bigint'
    })
    non_pooled_projetct_budget_id: number;

    @Column({
        name: 'non_pooled_projetct_id',
        type: 'bigint',
        nullable: false
    })
    non_pooled_projetct_id: number;

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

    @ManyToOne(() => NonPooledProject, npp => npp.obj_non_pooled_projetct_budget)
    @JoinColumn({
        name: 'non_pooled_projetct_id'
    })
    obj_non_pooled_projetct: NonPooledProject;

    @ManyToOne(() => Version, v => v.id)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;
}
