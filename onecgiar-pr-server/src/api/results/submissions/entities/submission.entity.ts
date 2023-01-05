import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Result } from '../../entities/result.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

@Entity('submission')
export class Submission {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Result, r => r.id)
    @JoinColumn({
        name: 'results_id'
    })
    results_id: number;

    @ManyToOne(() => User, (u) => u.id, { nullable: false })
    @JoinColumn({
      name: 'user_id',
    })
    user_id: number;

    @Column({
        name: 'status',
        type: 'boolean',
        nullable: false
    })
    status: boolean;

    @Column({
        name: 'comment',
        type: 'text',
        nullable: true
    })
    comment: string;

    @Column({
        name: 'is_active',
        type: 'boolean',
        nullable: false,
        default: true
    })
    is_active: boolean;

    @CreateDateColumn({
      name: 'created_date',
      nullable: false,
      type: 'timestamp',
    })
    created_date: Date;
}
