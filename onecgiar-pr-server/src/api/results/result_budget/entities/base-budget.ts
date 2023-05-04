import { Column } from 'typeorm';
export abstract class BaseBudget{
    @Column({
        name: 'current_year',
        type: 'bigint',
        nullable: true
    })
    current_year!: number;

    @Column({
        name: 'next_year',
        type: 'bigint',
        nullable: true
    })
    next_year!: number;

    @Column({
        name: 'is_determined',
        type: 'boolean',
        nullable: true
    })
    is_determined!: boolean;
}