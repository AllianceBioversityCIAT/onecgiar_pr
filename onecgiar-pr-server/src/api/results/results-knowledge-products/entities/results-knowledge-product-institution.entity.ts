import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ClarisaInstitution } from '../../../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';
import { ResultsByInstitution } from '../../results_by_institutions/entities/results_by_institution.entity';
import { ResultsKnowledgeProduct } from './results-knowledge-product.entity';

@Entity('results_kp_mqap_institutions')
export class ResultsKnowledgeProductInstitution {
  @PrimaryGeneratedColumn({
    name: 'result_kp_mqap_institution_id',
    type: 'bigint',
  })
  result_kp_mqap_institution_id: number;

  @Column()
  result_knowledge_product_id: number;

  @Column({
    name: 'intitution_name',
    type: 'text',
    nullable: true,
  })
  intitution_name: string;

  @Column()
  predicted_institution_id: number;

  @Column({
    name: 'confidant',
    type: 'float',
    nullable: true,
  })
  confidant: number;

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
    (r) => r.result_knowledge_product_altmetric_array,
  )
  @JoinColumn({
    name: 'result_knowledge_product_id',
  })
  result_knowledge_product_object: ResultsKnowledgeProduct;

  @ManyToOne(
    () => ClarisaInstitution,
    (r) => r.result_knowledge_product_institution_array,
  )
  @JoinColumn({
    name: 'predicted_institution_id',
  })
  predicted_institution_object: ClarisaInstitution;

  @OneToOne(
    () => ResultsByInstitution,
    (rbi) => rbi.result_kp_mqap_institution_object,
  )
  result_by_institution_object: ResultsByInstitution;
}
