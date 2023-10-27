import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('consensus_initiative_work_package')
export class consensusInitiativeWorkPackage {
  @PrimaryGeneratedColumn({
    name: 'consensus_initiative_work_package_id',
    type: 'bigint',
  })
  consensus_initiative_work_package_id: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;
}
