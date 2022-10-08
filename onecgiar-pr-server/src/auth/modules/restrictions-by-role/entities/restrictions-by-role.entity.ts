import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../role/entities/role.entity';
import { Restriction } from '../../restrictions/entities/restriction.entity';

@Entity('restrictions_by_role')
export class RestrictionsByRole {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Role, (r) => r.id, {nullable: false})
    @JoinColumn({
        name: 'role_id'
    })
    role_id: number;

    @ManyToOne(() => Restriction, (re) => re.id)
    @JoinColumn({
        name: 'restriction_id'
    })
    restriction_id: number;

    @Column({
        name: 'active',
        nullable: false,
        type: 'boolean',
        default: true
    })
    active: boolean;
}
