import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Result } from '../../entities/result.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ClarisaInstitution } from '../../../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';

@Entity('non_pooled_project')
export class NonPooledProject {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'grant_title',
        type: 'text' ,
        nullable: true
    })
    grant_title: string;

    @Column({
        name: 'center_grant_id',
        type: 'text',
        nullable: true
    })
    center_grant_id: string;

    @ManyToOne(() => Result, r => r.id)
    @JoinColumn({
        name: 'results_id'
    })
    results_id: number;

    @ManyToOne(() => ClarisaInstitution, ci => ci.id)
    @JoinColumn({
        name: 'lead_center_id'
    })
    lead_center_id: number;

    @ManyToOne(() => ClarisaInstitution, ci => ci.id)
    @JoinColumn({
        name: 'funder_institution_id'
    })
    funder_institution_id: number;

    @Column({
        name: 'is_active',
        type: 'boolean',
        nullable: false
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

    
}
