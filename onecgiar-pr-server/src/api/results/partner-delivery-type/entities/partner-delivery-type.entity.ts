import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('partner_delivery_type')
export class PartnerDeliveryType {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'name',
        type: 'text'
    })
    name: string;

    @Column({
        name: 'is_active',
        type: 'boolean'
    })
    is_active: boolean;
}
