import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('consensus_initiative_work_package')
export class consensusInitiativeWorkPackage{
    @PrimaryGeneratedColumn({
        name: 'consensus_initiative_work_package_id',
        type: 'int'
    })
    consensus_initiative_work_package_id: number;

    @Column({
        name: 'name',
        type: 'text'
    })
    name: string;
}