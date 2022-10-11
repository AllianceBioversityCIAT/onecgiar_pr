import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('version')
export class Version {
    @PrimaryGeneratedColumn({ 
        name: 'id',
        type: 'bigint' 
    })
    id: number;

    @Column({
        name: 'version_name',
        type: 'text',
        nullable: false
    })
    version_name: string;

    @Column({
        name: 'start_date',
        type: 'text',
        nullable: true
    })
    start_date!: string;

    @Column({
        name: 'end_date',
        type: 'text',
        nullable: true
    })
    end_date!: string;
}
