import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Evidence } from './evidence.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('evidence_sharepoint')
export class EvidenceSharepoint extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'document_id',
    type: 'varchar',
    length: 1000,
    nullable: true,
    default: null,
  })
  document_id;

  @Column({
    name: 'file_name',
    type: 'varchar',
    length: 1000,
    nullable: true,
    default: null,
  })
  file_name;

  @Column({
    name: 'folder_path',
    type: 'varchar',
    length: 1000,
    nullable: true,
    default: null,
  })
  folder_path;

  @Column({
    name: 'is_public_file',
    type: 'tinyint',
    default: 0,
  })
  is_public_file;

  // To relation with evidence

  @Column({ nullable: false, name: 'evidence_id' })
  evidence_id: number;

  @ManyToOne(() => Evidence, (evidence) => evidence.id)
  @JoinColumn({
    name: 'evidence_id',
  })
  evidence_object: Evidence;
}
