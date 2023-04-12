import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ComplementaryInnovationEnablerTypes } from './complementary-innovation-enabler-types.entity';
import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { Version } from '../../../results/versions/entities/version.entity';

@Entity('results_innovatio_packages_enabler_type')
export class ResultsInnovationPackagesEnablerType extends BaseEntity {
    @PrimaryGeneratedColumn({
        name: 'results_innovatio_packages_enabler_type_id',
        type: 'bigint'
    })
    results_innovatio_packages_enabler_type_id: number;

    @Column({
        name: 'result_by_innovation_package_id',
        type: 'bigint',
        nullable: false
    })
    result_by_innovation_package_id: number;

    @Column({
        name: 'complementary_innovation_enable_type_id',
        type: 'bigint',
        nullable: false
    })
    complementary_innovation_enable_type_id: number;

    //

    @ManyToOne(() => ComplementaryInnovationEnablerTypes, ciet => ciet.complementary_innovation_enabler_types_id)
    @JoinColumn({
        name: 'complementary_innovation_enable_type_id'
    })
    obj_complementary_innovation_enable_type: ComplementaryInnovationEnablerTypes;

    @ManyToOne(() => ResultInnovationPackage, rip => rip.children_innovation_packages_enabler_type)
    @JoinColumn({
        name: 'result_by_innovation_package_id'
    })
    obj_result_by_innovation_package: ResultInnovationPackage;

    @ManyToOne(() => Version, v => v.id)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;
}
