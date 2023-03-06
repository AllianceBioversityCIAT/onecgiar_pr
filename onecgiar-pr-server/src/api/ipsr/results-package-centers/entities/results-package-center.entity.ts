import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ClarisaCenter } from '../../../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { Version } from '../../../results/versions/entities/version.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('results_package_center')
export class ResultsPackageCenter extends BaseEntity{
    @PrimaryGeneratedColumn({
        name: 'results_package_center_id',
        type: 'bigint'
    })
    results_package_center_id: number;

    @Column({
        name: 'is_primary',
        type: 'boolean',
        nullable: true
    })
    is_primary: boolean;

    @Column({
        name: 'center_id',
        type: 'bigint'
    })
    center_id: number;

    @Column({
        name: 'result_package_id',
        type: 'bigint'
    })
    result_package_id: number;

    //---------------------------

    @ManyToOne(() => ClarisaCenter, cc => cc.results_package_center)
    @JoinColumn({
        name: 'center_id'
    })
    obj_center: ClarisaCenter;

    @ManyToOne(() => ResultInnovationPackage, rip => rip.results_package_center)
    @JoinColumn({
        name: 'result_package_id'
    })
    obj_results_package: ResultInnovationPackage;

    @ManyToOne(() => Version, v => v.results_package_center)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;
}
