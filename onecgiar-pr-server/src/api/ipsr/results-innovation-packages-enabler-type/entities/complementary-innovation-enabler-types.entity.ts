import { Entity, PrimaryGeneratedColumn, Column, OneToOne, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('complementary_innovation_enabler_types')
export class ComplementaryInnovationEnablerTypes extends BaseEntity {
    @PrimaryGeneratedColumn({
        name: 'complementary_innovation_enabler_types_id',
        type: 'bigint'
    })
    complementary_innovation_enabler_types_id: number;

    @Column({
        name: 'group',
        type: 'text',
        nullable: true
    })
    group!: string;

    @Column({
        name: 'type',
        type: 'bigint',
        nullable: true
    })
    type!: number;

    @Column({
        name: 'type',
        type: 'bigint',
        nullable: true
    })
    level!: number;

    @ManyToOne(()=> ComplementaryInnovationEnablerTypes, ciet => ciet.complementary_innovation_enabler_types_id)
    @JoinColumn({name:'type'})
    objType:ComplementaryInnovationEnablerTypes[];
}
