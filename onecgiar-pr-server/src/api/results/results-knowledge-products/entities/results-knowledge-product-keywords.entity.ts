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
import { Version } from '../../../versioning/entities/version.entity';
import { ResultsKnowledgeProduct } from './results-knowledge-product.entity';

@Entity('results_kp_keywords')
export class ResultsKnowledgeProductKeyword {
  @PrimaryGeneratedColumn({
    name: 'result_kp_keyword_id',
    type: 'bigint',
  })
  result_kp_keyword_id: number;

  @Column()
  result_knowledge_product_id: number;

  @Column({
    name: 'keyword',
    type: 'text',
    nullable: true,
  })
  keyword: string;

  @Column({
    name: 'is_agrovoc',
    type: 'boolean',
    nullable: true,
  })
  is_agrovoc: boolean;

  //versioning field
  @ManyToOne(() => Version, (v) => v.id, { nullable: false })
  @JoinColumn({
    name: 'version_id',
  })
  version_id: number;

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
    (r) => r.result_knowledge_product_keyword_array,
  )
  @JoinColumn({
    name: 'result_knowledge_product_id',
  })
  result_knowledge_product_object: ResultsKnowledgeProduct;
}
