import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('clarisa_institutions')
export class ClarisaInstitution {

    @PrimaryGeneratedColumn()
    id: number;



}
