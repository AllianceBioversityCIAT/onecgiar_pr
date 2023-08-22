import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResultsKnowledgeProductFairScore } from './results-knowledge-product-fair-scores.entity';

@Entity('fair_fields')
export class FairField {
  @PrimaryGeneratedColumn({
    name: 'fair_field_id',
    type: 'bigint',
  })
  fair_field_id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: false,
  })
  name: string;

  @Column({
    name: 'short_name',
    type: 'text',
    nullable: false,
  })
  short_name: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description: string;

  //relations

  @Column({ nullable: true })
  parent_id: number;

  //audit fields
  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @Column()
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

  @Column({ nullable: true })
  last_updated_by: number;

  //object relations
  @OneToMany(
    () => ResultsKnowledgeProductFairScore,
    (rkpfs) => rkpfs.fair_field_object,
  )
  result_knowledge_product_fair_score_array: ResultsKnowledgeProductFairScore[];

  @ManyToOne(() => FairField, (ff) => ff.children_array)
  @JoinColumn({
    name: 'parent_id',
  })
  parent_object: FairField;

  @OneToMany(() => FairField, (ff) => ff.parent_object)
  children_array: FairField[];
}
