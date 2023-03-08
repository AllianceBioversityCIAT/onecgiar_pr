import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TocResult } from '../../../../toc/toc-results/entities/toc-result.entity';
import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { Version } from '../../../results/versions/entities/version.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';

@Entity('results_innovation_package_toc_result')
export class ResultsPackageTocResult extends BaseEntity{
    @PrimaryGeneratedColumn({
        name: 'results_package_toc_result_id',
        type: 'bigint'
    })
    results_package_toc_result_id: number;

    @Column({
        name: 'toc_result_id',
        type: 'bigint',
        nullable: true
    })
    toc_result_id: number;

    @Column({
        name: 'results_package_id',
        type: 'bigint'
    })
    results_package_id: number;

    @Column({
        name: 'planned_result_packages',
        type: 'boolean',
        nullable: true
    })
    planned_result_packages: boolean;

    @Column({
        name: 'initiative_id',
        type: 'bigint',
        nullable: true
    })
    initiative_id: number;

    @ManyToOne(() => ClarisaInitiative, ci => ci.results_package_toc_result)
    @JoinColumn({
        name: 'initiative_id'
    })
    obj_initiative: ClarisaInitiative;

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
