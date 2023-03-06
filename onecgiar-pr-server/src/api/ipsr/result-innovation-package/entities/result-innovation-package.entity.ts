import { Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ResultsPackageTocResult } from '../../results-package-toc-result/entities/results-package-toc-result.entity';
import { ResultsPackageByInitiative } from '../../results-package-by-initiatives/entities/results-package-by-initiative.entity';
import { ResultsPackageCenter } from '../../results-package-centers/entities/results-package-center.entity';
import { NonPooledPackageProject } from '../../non-pooled-package-projects/entities/non-pooled-package-project.entity';

@Entity('result_innovation_package')
export class ResultInnovationPackage {
    @PrimaryGeneratedColumn({
        name: 'result_innovation_package_id',
        type: 'bigint'
    })
    result_innovation_package_id: number;

    @OneToMany(() => ResultsPackageTocResult, rptr => rptr.obj_results_package)
    results_package_toc_result: ResultsPackageTocResult[];

    @OneToMany(() => ResultsPackageByInitiative, rptr => rptr.obj_results_package)
    results_package_by_initiative: ResultsPackageByInitiative[];

    @OneToMany(() => ResultsPackageCenter, rptr => rptr.obj_results_package)
    results_package_center: ResultsPackageCenter[];

    @OneToMany(() => NonPooledPackageProject, rptr => rptr.obj_results_package)
    non_pooled_package_project: NonPooledPackageProject[];
}
