import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ResultsKnowledgeProduct } from '../../results-knowledge-products/entities/results-knowledge-product.entity';

@Entity('results_kp_fair_baseline')
export class KnowledgeProductFairBaseline {
  @PrimaryGeneratedColumn({
    name: 'results_kp_fair_baseline_id',
    type: 'bigint',
  })
  results_kp_fair_baseline_id: number;

  @Column({
    name: 'findable',
    type: 'float',
    nullable: true,
  })
  findable: number;

  @Column({
    name: 'accesible',
    type: 'float',
    nullable: true,
  })
  accesible: number;

  @Column({
    name: 'interoperable',
    type: 'float',
    nullable: true,
  })
  interoperable: number;

  @Column({
    name: 'reusable',
    type: 'float',
    nullable: true,
  })
  reusable: number;

  @Column({ nullable: false })
  knowledge_product_id: number;

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @Column({ nullable: false })
  created_by: number;

  //relations
  @ManyToOne(
    () => ResultsKnowledgeProduct,
    (rkp) => rkp.result_knowledge_product_id,
  )
  @JoinColumn({
    name: 'knowledge_product_id',
  })
  result_knowledge_product_object: ResultsKnowledgeProduct;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by_object: User;
}
