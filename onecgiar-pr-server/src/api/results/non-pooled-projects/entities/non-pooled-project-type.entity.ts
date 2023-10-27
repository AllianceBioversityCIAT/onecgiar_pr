import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('non_pooled_project_type')
export class NonPooledProjectType {
  @PrimaryGeneratedColumn({
    name: 'non_pooled_project_type_id',
    type: 'bigint',
  })
  non_pooled_project_type_id: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 45,
  })
  name: string;
}
