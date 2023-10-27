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
import { FairField } from './fair-fields.entity';

@Entity('results_kp_fair_scores')
export class ResultsKnowledgeProductFairScore {
  @PrimaryGeneratedColumn({
    name: 'results_kp_fair_score_id',
    type: 'bigint',
  })
  results_kp_fair_score_id: number;

  @Column()
  result_knowledge_product_id: number;

  @Column()
  fair_field_id: number;

  @Column({
    name: 'fair_value',
    type: 'float',
    nullable: false,
  })
  fair_value: number;

  @Column({
    name: 'is_baseline',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  is_baseline: boolean;

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
    (r) => r.result_knowledge_product_fair_score_array,
  )
  @JoinColumn({
    name: 'result_knowledge_product_id',
  })
  result_knowledge_product_object: ResultsKnowledgeProduct;

  @ManyToOne(
    () => FairField,
    (ff) => ff.result_knowledge_product_fair_score_array,
  )
  @JoinColumn({
    name: 'fair_field_id',
  })
  fair_field_object: FairField;
}
