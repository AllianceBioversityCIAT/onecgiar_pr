import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('active_backstopping')
export class ActiveBackstopping{
    @PrimaryGeneratedColumn({
        name: 'active_backstopping_id',
        type: 'bigint'
    })
    active_backstopping_id: number;

    @Column({
        name: 'name',
        type: 'text'
    }) 
    name: string;
}