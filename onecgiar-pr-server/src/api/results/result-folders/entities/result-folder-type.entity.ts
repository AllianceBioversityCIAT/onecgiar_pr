import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntityControlList } from '../../../../shared/entities/base-entity-control-list';

@Entity('result_folders_type')
export class ResultFolderType extends BaseEntityControlList {
  @PrimaryGeneratedColumn({
    name: 'result_folders_type_id',
    type: 'bigint',
  })
  result_folders_type_id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name: string;
}
