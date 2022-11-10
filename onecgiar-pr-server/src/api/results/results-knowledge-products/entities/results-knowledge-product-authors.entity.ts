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
import { Version } from '../../versions/entities/version.entity';
import { ResultsKnowledgeProduct } from './results-knowledge-product.entity';

@Entity('results_kp_authors')
export class ResultsKnowledgeProductAuthor {
  @PrimaryGeneratedColumn({
    name: 'result_kp_author_id',
    type: 'bigint',
  })
  result_kp_author_id: number;

  @Column()
  result_knowledge_product_id: number;

  @Column({
    name: 'author_name',
    type: 'text',
    nullable: true,
  })
  author_name: string;

  @Column({
    name: 'orcid',
    type: 'text',
    nullable: true,
  })
  orcid: string;

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
    (r) => r.result_knowledge_product_author_array,
  )
  @JoinColumn({
    name: 'result_knowledge_product_id',
  })
  result_knowledge_product_object: ResultsKnowledgeProduct;
}
