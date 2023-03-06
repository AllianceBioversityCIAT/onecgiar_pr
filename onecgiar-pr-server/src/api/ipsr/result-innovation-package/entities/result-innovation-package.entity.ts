import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ResultsPackageTocResult } from '../../results-package-toc-result/entities/results-package-toc-result.entity';
import { ResultsPackageByInitiative } from '../../results-package-by-initiatives/entities/results-package-by-initiative.entity';
import { ResultsPackageCenter } from '../../results-package-centers/entities/results-package-center.entity';
import { NonPooledPackageProject } from '../../non-pooled-package-projects/entities/non-pooled-package-project.entity';
import { Result } from "../../../../api/results/entities/result.entity";
import { ClarisaGeographicScope } from "../../../../clarisa/clarisa-geographic-scopes/entities/clarisa-geographic-scope.entity";
import { ClarisaInitiative } from "../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity";
import { GenderTagLevel } from "../../../../api/results/gender_tag_levels/entities/gender_tag_level.entity";
import { Version } from "../../../../api/results/versions/entities/version.entity";
import { BaseEntity } from "../../../../shared/entities/base-entity";
import { ResultInnovationPackageCountry } from "../../result-innovation-package-countries/entities/result-innovation-package-country.entity";
import { ResultInnovationPackageRegion } from "../../result-innovation-package-regions/entities/result-innovation-package-region.entity";

@Entity('results_innovation_package')
export class ResultInnovationPackage extends BaseEntity {
    @PrimaryGeneratedColumn({
        name: 'result_innovation_package_id',
        type: 'bigint'
    })
    result_innovation_package_id: number;

    @Column(({
        name: 'result_id',
        type: 'bigint'
    }))
    result_id: number;

    @Column(({
        name: 'initiative_id',
        type: 'bigint'
    }))
    initiative_id: number;

    @Column(({
        name: 'geo_scope_id',
        type: 'bigint'
    }))
    geo_scope_id: number;

    @Column({
        name: 'title',
        type: 'text'
    })
    title: string;

    @Column({
        name: 'description',
        type: 'text',
        nullable: true
    })
    description!: string;

    @Column(({
        name: 'gender_tag_level_id',
        type: 'bigint'
    }))
    gender_tag_level_id: number;

    @Column(({
        name: 'climate_tag_level_id',
        type: 'bigint'
    }))
    climate_tag_level_id: number;

    @Column({
        name: 'is_krs',
        type: 'boolean',
        nullable: true,
        default: null,
    })
    is_krs!: boolean;

    @ManyToOne(() => Result, r => r.result_innovation_package_array)
    @JoinColumn({
        name: 'result_id'
    })
    obj_result: Result;

    @ManyToOne(() => ClarisaInitiative, ci => ci.result_innovation_package_array)
    @JoinColumn({
        name: 'initiative_id'
    })
    obj_initiative: ClarisaInitiative;

    @ManyToOne(() => ClarisaGeographicScope, cgs => cgs.result_innovation_package_array)
    @JoinColumn({
        name: 'geo_scope_id'
    })
    obj_geo_scope: ClarisaGeographicScope;

    @ManyToOne(() => GenderTagLevel, gtl => gtl.result_innovation_package_array)
    @JoinColumn({
        name: 'gender_tag_level_id',
    })
    obj_gender_tag_level: GenderTagLevel;

    @ManyToOne(() => GenderTagLevel, gtl => gtl.result_innovation_package_array)
    @JoinColumn({
        name: 'climate_tag_level_id'
    })
    obj_climate_tag_level: GenderTagLevel;

    @ManyToOne(() => Version, v => v.result_innovation_package_array)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;

    @OneToMany(() => ResultsPackageTocResult, rptr => rptr.obj_results_package)
    results_package_toc_result: ResultsPackageTocResult[];

    @OneToMany(() => ResultsPackageByInitiative, rptr => rptr.obj_results_package)
    results_package_by_initiative: ResultsPackageByInitiative[];

    @OneToMany(() => ResultsPackageCenter, rptr => rptr.obj_results_package)
    results_package_center: ResultsPackageCenter[];

    @OneToMany(() => NonPooledPackageProject, rptr => rptr.obj_results_package)
    non_pooled_package_project: NonPooledPackageProject[];

    @OneToMany(() => ResultInnovationPackageCountry, ripc => ripc.obj_result_innovation_package)
    result_innovation_package_country_array: ResultInnovationPackageCountry[];

    @OneToMany(() => ResultInnovationPackageRegion, ripr => ripr.obj_result_innovation_package)
    result_innovation_package_region_array: ResultInnovationPackageRegion[];
}
