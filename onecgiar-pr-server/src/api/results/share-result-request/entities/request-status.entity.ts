import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('request_status')
export class RequestStatus{

    @PrimaryGeneratedColumn({
        name: 'request_status_id'
    })
    request_status_id: number;

    @Column({
        name: 'name',
        type: 'text',
        nullable: true
    })
    name!: string;

    @Column({
        name: 'description',
        type: 'text',
        nullable: true
    })
    description!: string;

}