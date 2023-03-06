import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ResultsPackageTocResult } from '../../../ipsr/results-package-toc-result/entities/results-package-toc-result.entity';
import { ResultsPackageByInitiative } from '../../../ipsr/results-package-by-initiatives/entities/results-package-by-initiative.entity';
import { ResultsPackageCenter } from '../../../ipsr/results-package-centers/entities/results-package-center.entity';
import { NonPooledPackageProject } from '../../../ipsr/non-pooled-package-projects/entities/non-pooled-package-project.entity';

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
}
