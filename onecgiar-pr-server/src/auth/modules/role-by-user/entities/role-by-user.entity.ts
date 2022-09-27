import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Role } from "../../role/entities/role.entity";
import { User } from '../../user/entities/user.entity';
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { ClarisaActionArea } from '../../../../clarisa/clarisa-action-areas/entities/clarisa-action-area.entity';

@Entity('role_by_user')
export class RoleByUser {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Role, (r) => r.id)
    @JoinColumn({
        name: 'role'
    })
    role: number;

    @ManyToOne(() => ClarisaInitiative, (ci) => ci.id, {nullable: true})
    @JoinColumn({
        name: 'initiative_id'
    })
    initiative_id!: number

    @ManyToOne(() => ClarisaActionArea, (ca) => ca.id, {nullable: true})
    @JoinColumn({
        name: 'action_area_id'
    })
    action_area_id!: number;

    @ManyToOne(() => User, (u) => u.id)
    @JoinColumn({
        name: 'user'
    })
    user: number;

    @Column({
        name: 'active',
        type: 'boolean',
        default: true
    })
    active: boolean;

    @ManyToOne(() => User, u => u.id, { nullable: false })
    @JoinColumn({
        name: 'created_by'
    })
    created_by: number;

    @CreateDateColumn({
        name: 'created_date'
    })
    created_date: Date;

    @ManyToOne(() => User, u => u.id, { nullable: true })
    @JoinColumn({
        name: 'last_updated_by'
    })
    last_updated_by!: number;

    @UpdateDateColumn({
        name: 'last_updated_date',
        nullable: true
    })
    last_updated_date!: Date;
}
