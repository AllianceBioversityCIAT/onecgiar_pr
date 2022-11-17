import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Result } from '../../entities/result.entity';
import { Version } from '../../versions/entities/version.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

@Entity('results_innovations_dev')
export class ResultsInnovationsDev {

    @PrimaryGeneratedColumn({
        name: 'result_innovation_dev_id'
    })
    result_innovation_dev_id: number;

    @OneToOne(() => Result, r => r.id, { nullable: false })
    @JoinColumn({
        name: 'results_id'
    })
    results_id: number;

    @Column({
        name: 'short_title',
        nullable: true,
        type: 'text'
    })
    short_title: string;

    /**
     * !foraneas
     */

    @Column({
        name: 'is_new_variety',
        type: 'boolean',
        nullable: true
    })
    is_new_variety!: boolean;

    @Column({
        name: 'number_of_varieties',
        type: 'bigint',
        nullable: true
    })
    number_of_varieties!: number;

    @Column({
        name: 'innovation_developers',
        type: 'text',
        nullable: true
    })
    innovation_developers!: string;

    @Column({
        name: 'innovation_collaborators',
        type: 'text',
        nullable: true
    })
    innovation_collaborators!: string;

    @Column({
        name: 'readiness_level',
        type: 'text',
        nullable: true
    })
    readiness_level!: string;

    @Column({
        name: 'evidences_justification',
        type: 'text',
        nullable: true
    })
    evidences_justification!: string;

    @Column({
        name: 'is_active',
        type: 'boolean',
        nullable: false,
        default: true
    })
    is_active: boolean;

    @ManyToOne(() => Version, v => v.id)
    @JoinColumn({
        name: 'version_id'
    })
    version_id: number;

    @ManyToOne(() => User, (u) => u.id, { nullable: false })
    @JoinColumn({
        name: 'created_by',
    })
    created_by: number;

    @CreateDateColumn({
        name: 'created_date',
        nullable: false,
        type: 'timestamp',
    })
    created_date: Date;

    @ManyToOne(() => User, (u) => u.id, { nullable: true })
    @JoinColumn({
        name: 'last_updated_by',
    })
    last_updated_by!: number;

    @UpdateDateColumn({
        name: 'last_updated_date',
        type: 'timestamp',
        nullable: true,
    })
    last_updated_date!: Date;

}