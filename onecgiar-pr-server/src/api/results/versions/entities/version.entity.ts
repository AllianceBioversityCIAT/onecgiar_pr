import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ResultsPackageTocResult } from '../../../ipsr/results-package-toc-result/entities/results-package-toc-result.entity';
import { ResultsPackageByInitiative } from '../../../ipsr/results-package-by-initiatives/entities/results-package-by-initiative.entity';
import { ResultsPackageCenter } from '../../../ipsr/results-package-centers/entities/results-package-center.entity';
import { NonPooledPackageProject } from '../../../ipsr/non-pooled-package-projects/entities/non-pooled-package-project.entity';
import { ResultInnovationPackageRegion } from '../../../../api/ipsr/result-innovation-package-regions/entities/result-innovation-package-region.entity';
import { ResultInnovationPackageCountry } from '../../../../api/ipsr/result-innovation-package-countries/entities/result-innovation-package-country.entity';
import { ResultInnovationPackage } from '../../../../api/ipsr/result-innovation-package/entities/result-innovation-package.entity';

@Entity('version')
export class Version {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'version_name',
    type: 'text',
    nullable: false,
  })
  version_name: string;

  @Column({
    name: 'start_date',
    type: 'text',
    nullable: true,
  })
  start_date!: string;

  @Column({
    name: 'end_date',
    type: 'text',
    nullable: true,
  })
  end_date!: string;

  @OneToMany(() => ResultsPackageTocResult, rptr => rptr.obj_version)
  results_package_toc_result: ResultsPackageTocResult[];

  @OneToMany(() => ResultsPackageByInitiative, rptr => rptr.obj_version)
  results_package_by_initiative: ResultsPackageByInitiative[];

  @OneToMany(() => ResultsPackageCenter, rptr => rptr.obj_version)
  results_package_center: ResultsPackageCenter[];

  @OneToMany(() => NonPooledPackageProject, rptr => rptr.obj_version)
  non_pooled_package_project: NonPooledPackageProject[];

  @OneToMany(() => ResultInnovationPackage, rip => rip.obj_version)
  result_innovation_package_array: ResultInnovationPackage[];

  @OneToMany(() => ResultInnovationPackageRegion, ripr => ripr.obj_version)
  result_innovation_package_region_array: ResultInnovationPackageRegion[];

  @OneToMany(() => ResultInnovationPackageCountry, ripc => ripc.obj_version)
  result_innovation_package_country_array: ResultInnovationPackageCountry[];
}
