import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('capdevs_delivery_methods')
export class CapdevsDeliveryMethod {

    @PrimaryGeneratedColumn({
        name: 'capdev_delivery_method_id'
    })
    capdev_delivery_method_id: number;

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
