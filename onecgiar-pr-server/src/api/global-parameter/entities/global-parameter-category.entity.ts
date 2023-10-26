import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { GlobalParameter } from './global-parameter.entity';

@Entity('global_parameter_categories')
export class GlobalParameterCategory {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'name',
    type: 'varchar',
    nullable: false,
    length: 64,
  })
  name: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description: string;

  @OneToMany(
    () => GlobalParameter,
    (globalParameter) => globalParameter.global_parameter_category_object,
  )
  globalParameters: GlobalParameter[];
}
