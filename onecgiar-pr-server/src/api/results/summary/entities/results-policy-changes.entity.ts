import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Result } from '../../entities/result.entity';
import { Version } from '../../versions/entities/version.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ClarisaPolicyStage } from '../../../../clarisa/clarisa-policy-stages/entities/clarisa-policy-stage.entity';
import { ClarisaPolicyType } from '../../../../clarisa/clarisa-policy-types/entities/clarisa-policy-type.entity';

@Entity('results_policy_changes')
export class ResultsPolicyChanges{

    @PrimaryGeneratedColumn({
        name: 'result_policy_change_id'
    })
    result_policy_change_id: number;

    @OneToOne(() => Result, r => r.id, {nullable: false})
    @JoinColumn({
        name: 'result_id'
    })
    result_id: number;

    @ManyToOne(() => ClarisaPolicyStage, cps => cps.id, {nullable: true})
    @JoinColumn({
        name: 'policy_stage_id'
    })
    policy_stage_id!: number;

    @ManyToOne(() => ClarisaPolicyType, cpt => cpt.id, { nullable: true})
    @JoinColumn({
        name: 'policy_type_id'
    })
    policy_type_id!: number;

    @Column({
        name: 'amount',
        type: 'float',
        nullable: true
    })
    amount!:number;

    @Column({
        name: 'is_active',
        type: 'boolean',
        nullable: false,
        default: true
    })
    is_active: boolean;

    @ManyToOne(() => Version, v => v.id)
    @JoinColumn({
        name: 'version_id'
    })
    version_id: number;

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
}