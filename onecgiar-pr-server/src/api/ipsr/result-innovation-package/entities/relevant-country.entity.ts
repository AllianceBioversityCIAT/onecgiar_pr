import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('relevant_country')
export class RelevantCountry{
    @PrimaryGeneratedColumn({
        name: 'relevant_country_id',
        type: 'bigint'
    })
    relevant_country_id: number;

    @Column({
        name: 'name',
        type: 'text'
    }) 
    name: string;
}