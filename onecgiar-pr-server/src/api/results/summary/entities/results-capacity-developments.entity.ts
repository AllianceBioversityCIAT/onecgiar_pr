import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Result } from '../../entities/result.entity';
import { Version } from '../../versions/entities/version.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { CapdevsDeliveryMethod } from '../../capdevs-delivery-methods/entities/capdevs-delivery-method.entity';
import { CapdevsTerm } from '../../capdevs-terms/entities/capdevs-term.entity';

@Entity('results_capacity_developments')
export class ResultsCapacityDevelopments{

    @PrimaryGeneratedColumn({
        name: 'result_capacity_development_id'
    })
    result_capacity_development_id: number;

    @OneToOne(() => Result, r => r.id, { nullable: false })
    @JoinColumn({
        name: 'result_id'
    })
    result_id: number;

    @Column({
        name: 'male_using',
        type: 'bigint',
        nullable: true
    })
    male_using!: number;

    @Column({
        name: 'female_using',
        type: 'bigint',
        nullable: true
    })
    female_using!: number;

    @ManyToOne(() => CapdevsDeliveryMethod, cdm => cdm.capdev_delivery_method_id, {nullable: true})
    @JoinColumn({
        name: 'capdev_delivery_method_id'
    })
    capdev_delivery_method_id!: number;

    @ManyToOne(() => CapdevsTerm, ct => ct.capdev_term_id, { nullable: true})
    @JoinColumn({
        name: 'capdev_term_id'
    })
    capdev_term_id!: number

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