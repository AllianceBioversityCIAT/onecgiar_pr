import { User } from "src/auth/modules/user/entities/user.entity";
import { Column, CreateDateColumn, JoinColumn, OneToMany, UpdateDateColumn } from "typeorm";

export abstract class Auditable{
    
    @CreateDateColumn({
        name:'created_at',
        nullable: false
    })
    created_at: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        nullable: true
    })
    updated_at!: Date;

    @Column({
        name: 'updated_by',
        type: 'int',
        nullable: true
    })
    updated_by!: number;
}