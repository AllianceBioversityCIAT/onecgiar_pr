import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { Version } from '../../results/versions/entities/version.entity';
import { Result } from '../../results/entities/result.entity';
import { IpsrRole } from './ipsr-role.entity';
import { ResultInnovationPackage } from '../result-innovation-package/entities/result-innovation-package.entity';

@Entity('result_by_innovation_package')
export class Ipsr extends BaseEntity{
    @PrimaryGeneratedColumn({
        name: 'result_by_innovation_package_id',
        type: 'bigint'
    })
    result_by_innovation_package_id: number;

    @Column({
        name: 'result_innovation_package_id',
        type: 'bigint'
    }) 
    result_innovation_package_id: number;

    @Column({
        name: 'result_id',
        type: 'bigint'
    })
    result_id: number;

    @Column({
        name: 'ipsr_role_id',
        type: 'bigint'
    })
    ipsr_role_id: number;

    @ManyToOne(() => IpsrRole, ir => ir.obj_ipsr_role)
    @JoinColumn({
        name: 'ipsr_role_id'
    })
    obj_ipsr_role: IpsrRole;

    @ManyToOne(() => Version, v => v.innovation_by_result)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;

    @ManyToOne(() => ResultInnovationPackage, r => r.result_innovation_package_id)
    @JoinColumn({
        name: 'result_innovation_package_id'
    })
    obj_result_by_innovation_package: ResultInnovationPackage;

    @ManyToOne(() => Result, r => r.obj_result)
    @JoinColumn({
        name: 'result_id'
    })
    obj_result: Result;
}
