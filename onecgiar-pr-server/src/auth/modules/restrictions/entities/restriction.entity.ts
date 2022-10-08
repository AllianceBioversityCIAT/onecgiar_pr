import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('restriction')
export class Restriction {

    @PrimaryGeneratedColumn()
    id: number;
}
