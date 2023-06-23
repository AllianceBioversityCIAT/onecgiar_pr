import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Version } from './version.entity';

@Entity('application_modules')
export class ApplicationModules {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'app_module_id',
  })
  app_module_id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: false,
  })
  name: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @Column({
    name: 'created_date',
    type: 'timestamp',
    nullable: true,
  })
  created_date: Date;

  @OneToMany(() => Version, (v) => v.obj_app_module)
  obj_version: Version[];
}
