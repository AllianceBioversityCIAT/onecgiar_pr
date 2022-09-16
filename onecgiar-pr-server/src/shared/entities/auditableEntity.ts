import { User } from "src/auth/modules/user/entities/user.entity";
import { Column, CreateDateColumn, JoinColumn, OneToMany, UpdateDateColumn } from "typeorm";

export abstract class Auditable{
    
    @CreateDateColumn({
        name:'create_at',
        nullable: false
    })
    create_at: Date;

    @UpdateDateColumn({
        name: 'update_at',
        nullable: true
    })
    update_at!: Date;

    @Column({
        name: 'updated_by',
        type: 'int',
        nullable: true
    })
    updated_by!: number;
}