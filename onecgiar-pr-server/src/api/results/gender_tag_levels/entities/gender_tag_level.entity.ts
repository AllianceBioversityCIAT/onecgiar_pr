import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ResultInnovationPackage } from '../../../../api/ipsr/result-innovation-package/entities/result-innovation-package.entity';

@Entity()
export class GenderTagLevel {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'title',
    type: 'text',
    nullable: true,
  })
  title!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string;

  @OneToMany(() => ResultInnovationPackage, rip => rip.obj_gender_tag_level)
  result_innovation_package_array: ResultInnovationPackage[];
}
