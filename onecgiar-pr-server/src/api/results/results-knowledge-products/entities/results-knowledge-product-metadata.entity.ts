import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ResultsKnowledgeProduct } from './results-knowledge-product.entity';

@Entity('results_kp_metadata')
export class ResultsKnowledgeProductMetadata {
  @PrimaryGeneratedColumn({
    name: 'result_kp_metadata_id',
    type: 'bigint',
  })
  result_kp_metadata_id: number;

  @Column()
  result_knowledge_product_id: number;

  @Column({
    name: 'source',
    type: 'text',
    nullable: true,
  })
  source: string;

  @Column({
    name: 'is_isi',
    type: 'boolean',
    nullable: true,
  })
  is_isi: boolean;

  @Column({
    name: 'accesibility',
    type: 'text',
    nullable: true,
  })
  accesibility: string;

  @Column({
    name: 'open_access',
    type: 'text',
    nullable: true,
  })
  open_access: string;

  @Column({
    name: 'year',
    type: 'bigint',
    nullable: true,
  })
  year: number;

  @Column({
    name: 'online_year',
    type: 'bigint',
    nullable: true,
  })
  online_year: number;

  @Column({
    name: 'doi',
    type: 'text',
    nullable: true,
  })
  doi: string;

  @Column({
    name: 'is_peer_reviewed',
    type: 'boolean',
    nullable: true,
  })
  is_peer_reviewed: boolean;

  //audit fields
  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by: number;

  //object relations
  @ManyToOne(
    () => ResultsKnowledgeProduct,
    (r) => r.result_knowledge_product_metadata_array,
  )
  @JoinColumn({
    name: 'result_knowledge_product_id',
  })
  result_knowledge_product_object: ResultsKnowledgeProduct;
}
