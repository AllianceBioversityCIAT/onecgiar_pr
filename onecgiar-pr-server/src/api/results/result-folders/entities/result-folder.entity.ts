import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntityControlList } from '../../../../shared/entities/base-entity-control-list';
import { Version } from '../../../versioning/entities/version.entity';
import { ResultFolderType } from './result-folder-type.entity';

@Entity('result_folders')
export class ResultFolder extends BaseEntityControlList {
  @PrimaryGeneratedColumn({
    name: 'result_folders_id',
    type: 'bigint',
  })
  result_folders_id: number;

  @Column({
    name: 'folder_link',
    type: 'text',
    nullable: false,
  })
  folder_path: string;

  @Column({
    name: 'folder_type_id',
    type: 'bigint',
    nullable: false,
  })
  folder_type_id: number;

  @Column({
    name: 'phase_id',
    type: 'bigint',
    nullable: false,
  })
  phase_id: number;

  @ManyToOne(() => Version, (v) => v.id)
  @JoinColumn({ name: 'phase_id' })
  obj_phase: Version;

  @ManyToOne(() => ResultFolderType, (rft) => rft.result_folders_type_id)
  @JoinColumn({ name: 'folder_type_id' })
  obj_folder_type: ResultFolderType;
}
