import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Result } from "../../entities/result.entity";
import { InitiativeRole } from "../../initiative_roles/entities/initiative_role.entity";
import { User } from "../../users/entities/user.entity";
import { Version } from "../../versions/entities/version.entity";

@Entity()
export class ResultsByInititiative {
    @ManyToOne(() => Result, r => r.id)
    @PrimaryColumn({
        name: 'result_id',
        type: 'bigint'
    })
    resultId: number;

    // @ManyToOne(() => Inititiative, i => i.id)
    // @PrimaryColumn({ name: 'inititiative_id', type: 'bigint' })
    // inititiative_id: number;

    @Column({
        name: 'inititiative_id',
        type: 'bigint',
        nullable: false
    })
    inititiative_id: number;

    @ManyToOne(() => InitiativeRole, v => v.id, { nullable: false })
    @JoinColumn({
        name: 'initiative_role_id'
    })
    initiative_role_id: number;

    @Column({
        name: 'is_active',
        type: 'tinyint',
        nullable: false
    })
    is_active: number;

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
        nullable: false
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
