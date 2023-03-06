import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ResultsPackageByInitiative } from '../../../ipsr/results-package-by-initiatives/entities/results-package-by-initiative.entity';

@Entity('initiative_roles')
export class InitiativeRole {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string;

  @OneToMany(() => ResultsPackageByInitiative, rptr => rptr.obj_initiative_role)
  results_package_by_initiative: ResultsPackageByInitiative[];
}
