import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Version } from '../../../results/versions/entities/version.entity';
import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';

@Entity('result_ip_measure')
export class ResultIpMeasure extends BaseEntity {

    @PrimaryGeneratedColumn({
        name: 'result_ip_measure_id',
        type: 'bigint'
    })
    result_ip_measure_id: number;

    @Column({
        name: 'unit_of_measure',
        type: 'text',
        nullable: true
    })
    unit_of_measure!: string;

    @Column({
        name: 'quantity',
        type: 'float',
        nullable: true
    })
    quantity!: number;

    @Column({
        name: 'result_ip_id',
        type: 'bigint'
    })
    result_ip_id: number;

    @ManyToOne(() => ResultInnovationPackage, r => r.result_innovation_package_id)
    @JoinColumn({
        name: 'result_ip_id'
    })
    obj_result: ResultInnovationPackage;

    @ManyToOne(() => Version, v => v.id)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;

}
