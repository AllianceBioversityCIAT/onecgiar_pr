import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('token_report_bi')
export class TokenBiReport {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'token_bi',
        type: 'text',
        nullable: false,
    })
    token_bi: string;

    @Column({
        name: 'expiration_toke_id',
        type: 'timestamp',
        nullable: false,
    })
    expiration_toke_id: Date;

    @Column({
        name: 'is_active',
        type: 'boolean',
        nullable: false,
        default: true
    })
    is_active: boolean;
}