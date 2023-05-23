import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../../../../shared/entities/base-entity"
import { Result } from "../../../results/entities/result.entity";

@Entity('result_ip_expert_workshop_organized')
export class ResultIpExpertWorkshopOrganized extends BaseEntity {
    @PrimaryGeneratedColumn({
        name: 'result_ip_expert_workshop_organized_id',
        type: 'bigint'
    })
    result_ip_expert_workshop_organized_id: number;

    @Column({
        name: 'result_id',
        type: 'bigint'
    })
    result_id: number;

    @Column({
        name: 'first_name',
        type: 'text'
    })
    first_name: string;

    @Column({
        name: 'last_name',
        type: 'text'
    })
    last_name: string;

    @Column({
        name: 'email',
        type: 'text',
        nullable: true
    })
    email: string;

    @Column({
        name: 'workshop_role',
        type: 'text',
        nullable: true
    })
    workshop_role: string;

    @ManyToOne(() => Result, r => r.id)
    @JoinColumn({
        name: 'result_id'
    })
    obj_result_expert_workshop: Result[];
}