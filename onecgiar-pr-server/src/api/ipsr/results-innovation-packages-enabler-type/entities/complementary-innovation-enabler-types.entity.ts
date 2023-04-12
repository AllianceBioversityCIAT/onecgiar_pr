import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
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
        type: 'text',
        nullable: true
    })
    type!: string;

    @Column({
        name: 'is_active',
        type: 'boolean',
        nullable: false,
        default: true
    })
    is_active!: boolean
}
