import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Role } from '../../role/entities/role.entity';
import { Action } from '../../actions/entities/action.entity';

@Entity('permission_by_role')
export class PermissionByRole {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Role, (role) => role.id)
    @JoinColumn({
        name: 'role_id'
    })
    role_id: number;

    @ManyToOne(() => Action, (action) => action.id)
    @JoinColumn({
        name: 'action_id'
    })
    action_id: number;

    @Column({
        name:'active',
        type: 'boolean'
    })
    active: boolean;
}
