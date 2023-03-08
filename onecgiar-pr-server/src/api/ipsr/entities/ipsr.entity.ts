import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { Version } from '../../results/versions/entities/version.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('innovation_by_result')
export class Ipsr extends BaseEntity{
    @PrimaryGeneratedColumn({
        name: 'innovation_by_result_id',
        type: 'bigint'
    })
    innovation_by_result_id: number;

    @Column({
        name: 'ipsr_result_id',
        type: 'bigint'
    }) 
    ipsr_result_id: number;

    @Column({
        name: 'result_id',
        type: 'bigint'
    })
    result_id: number;

    @ManyToOne(() => Version, v => v.innovation_by_result)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;

    @ManyToOne(() => Result, r => r.obj_ipsr_result)
    @JoinColumn({
        name: 'ipsr_result_id'
    })
    obj_ipsr_result: Result;

    @ManyToOne(() => Result, r => r.obj_result)
    @JoinColumn({
        name: 'result_id'
    })
    obj_result: Result;
}
