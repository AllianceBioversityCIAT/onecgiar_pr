import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('toc_level')
export class TocLevel {

    @PrimaryGeneratedColumn({
        name: 'toc_level_id'
    })
    toc_level_id: number;

    @Column({
        type: 'text',
        name: 'name',
        nullable: true
    })
    name: string;

    @Column({
        type: 'text',
        name: 'description',
        nullable: true
    })
    description: string;
}
