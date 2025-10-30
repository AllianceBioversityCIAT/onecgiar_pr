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
import { Result } from '../../entities/result.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ClarisaInnovationCharacteristic } from '../../../../clarisa/clarisa-innovation-characteristics/entities/clarisa-innovation-characteristic.entity';
import { ClarisaInnovationType } from '../../../../clarisa/clarisa-innovation-type/entities/clarisa-innovation-type.entity';
import { ClarisaInnovationReadinessLevel } from '../../../../clarisa/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';

@Entity('results_innovations_dev')
export class ResultsInnovationsDev {
  @PrimaryGeneratedColumn({
    name: 'result_innovation_dev_id',
  })
  result_innovation_dev_id: number;

  @OneToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({
    name: 'results_id',
  })
  results_id: number;

  @Column({
    name: 'short_title',
    nullable: true,
    type: 'text',
  })
  short_title!: string;

  @ManyToOne(() => ClarisaInnovationCharacteristic, (cic) => cic.id, {
    nullable: true,
  })
  @JoinColumn({
    name: 'innovation_characterization_id',
  })
  innovation_characterization_id!: number;

  @ManyToOne(() => ClarisaInnovationType, (cit) => cit.code, { nullable: true })
  @JoinColumn({
    name: 'innovation_nature_id',
  })
  innovation_nature_id!: number;

  @ManyToOne(() => ClarisaInnovationReadinessLevel, (cir) => cir.id, {
    nullable: true,
  })
  @JoinColumn({
    name: 'innovation_readiness_level_id',
  })
  innovation_readiness_level_id!: number;

  @Column({
    name: 'is_new_variety',
    type: 'boolean',
    nullable: true,
  })
  is_new_variety!: boolean;

  @Column({
    name: 'has_scaling_studies',
    type: 'boolean',
    nullable: true,
  })
  has_scaling_studies: boolean;

  @Column({
    name: 'number_of_varieties',
    type: 'bigint',
    nullable: true,
  })
  number_of_varieties!: number;

  @Column({
    name: 'innovation_developers',
    type: 'text',
    nullable: true,
  })
  innovation_developers!: string;

  @Column({
    name: 'innovation_collaborators',
    type: 'text',
    nullable: true,
  })
  innovation_collaborators!: string;

  @Column({
    name: 'innovation_acknowledgement',
    type: 'text',
    nullable: true,
  })
  innovation_acknowledgement!: string;

  @Column({
    name: 'readiness_level',
    type: 'text',
    nullable: true,
  })
  readiness_level!: string;

  @Column({
    name: 'evidences_justification',
    type: 'text',
    nullable: true,
  })
  evidences_justification!: string;

  @Column({
    name: 'innovation_pdf',
    type: 'boolean',
    nullable: true,
  })
  innovation_pdf!: boolean;

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

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date!: Date;

  @Column({
    name: 'innovation_user_to_be_determined',
    type: 'boolean',
    nullable: true,
  })
  innovation_user_to_be_determined!: boolean;
}
