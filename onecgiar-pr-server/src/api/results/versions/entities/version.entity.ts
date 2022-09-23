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
        type: 'varchar',
        length: 45,
        nullable: false
    })
    version_name: string;

    @Column({
        name: 'start_date',
        type: 'varchar',
        length: 45,
        nullable: true
    })
    start_date!: string;

    @Column({
        name: 'end_date',
        type: 'varchar',
        length: 45,
        nullable: true
    })
    end_date!: string;
}
