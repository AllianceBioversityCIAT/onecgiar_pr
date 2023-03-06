import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TocResult } from '../../../../toc/toc-results/entities/toc-result.entity';
import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { Version } from '../../../results/versions/entities/version.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('results_innovation_package_toc_result')
export class ResultsPackageTocResult extends BaseEntity{
    @PrimaryGeneratedColumn({
        name: 'results_package_toc_result_id',
        type: 'bigint'
    })
    results_package_toc_result_id: number;

    @Column({
        name: 'toc_result_id',
        type: 'bigint'
    })
    toc_result_id: number;

    @Column({
        name: 'results_package_id',
        type: 'bigint'
    })
    results_package_id: number;

    @Column({
        name: 'planned_result_packages',
        type: 'boolean'
    })
    planned_result_packages: boolean;

    @ManyToOne(() => Version, v => v.results_package_toc_result)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;

    @ManyToOne(() => ResultInnovationPackage, rip => rip.results_package_toc_result)
    @JoinColumn({
        name: 'results_package_id'
    })
    obj_results_package: ResultInnovationPackage;

    @ManyToOne(() => TocResult, tr => tr.results_package_toc_result)
    @JoinColumn({
        name: 'toc_result_id'
    })
    obj_toc_result: TocResult;

}
