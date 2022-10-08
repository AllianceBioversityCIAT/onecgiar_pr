import { User } from "../../../../auth/modules/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Result } from "../../entities/result.entity";
import { InitiativeRole } from "../../initiative_roles/entities/initiative_role.entity";
import { Version } from "../../versions/entities/version.entity";
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';

@Entity()
export class ResultsByInititiative {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Result, r => r.id)
    @JoinColumn({
        name: 'result_id'
    })
    result_id: number;

    @ManyToOne(() => ClarisaInitiative, i => i.id)
    @JoinColumn({ 
        name: 'inititiative_id' 
    })
    initiative_id: number;

    @ManyToOne(() => InitiativeRole, v => v.id, { nullable: false })
    @JoinColumn({
        name: 'initiative_role_id'
    })
    initiative_role_id: number;

    @Column({
        name: 'is_active',
        type: 'boolean',
        nullable: false,
        default: true
    })
    is_active: boolean;

    @ManyToOne(() => Version, v => v.id, { nullable: false })
    @JoinColumn({
        name: 'version_id'
    })
    version_id: number;

    @ManyToOne(() => User, u => u.id, { nullable: false })
    @JoinColumn({
        name: 'created_by'
    })
    created_by: number;

    @CreateDateColumn({
        name: 'created_date',
        nullable: false,
        type: 'timestamp'
    })
    created_date: Date;

    @ManyToOne(() => User, u => u.id, { nullable: true })
    @JoinColumn({
        name: 'last_updated_by'
    })
    last_updated_by!: number;

    @UpdateDateColumn({
        name: 'last_updated_date',
        type: 'timestamp',
        nullable: true
    })
    last_updated_date!: Date;
}
