import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Result } from '../../entities/result.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { Version } from '../../versions/entities/version.entity';

@Entity('results_innovations_use')
export class ResultsInnovationsUse {

    @PrimaryGeneratedColumn({
        name: 'result_innovations_use_measure_id'
    })
    result_innovations_use_measure_id: number;

    @OneToOne(() => Result, r => r.id, { nullable: false })
    @JoinColumn({
        name: 'results_id'
    })
    results_id: number;

    @Column({
        name: 'male_using',
        type: 'bigint',
        nullable: true
    })
    male_using: number;

    @Column({
        name: 'female_using',
        type: 'bigint',
        nullable: true
    })
    female_using: number;

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