import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResultInnovationPackageRegion } from '../../../api/ipsr/result-innovation-package-regions/entities/result-innovation-package-region.entity';

@Entity('clarisa_regions')
export class ClarisaRegion {
  @PrimaryGeneratedColumn()
  um49Code: number;

  @Column({
    type: 'text',
    name: 'name',
  })
  name: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  parent_regions_code: number;

  //object relations
  @ManyToOne(() => ClarisaRegion, (cr) => cr.um49Code)
  @JoinColumn({
    name: 'parent_regions_code',
  })
  parent_region_object: ClarisaRegion;

  @OneToMany(() => ClarisaRegion, (cr) => cr.parent_region_object)
  children_array: ClarisaRegion[];

  @OneToMany(() => ResultInnovationPackageRegion, ripr => ripr.obj_region)
  result_innovation_package_region_array: ResultInnovationPackageRegion[];
}
