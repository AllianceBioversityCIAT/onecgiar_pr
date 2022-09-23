import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn({
        name: 'id',
        type: 'bigint'
    })
    id: number;

    @Column({
        name: 'first_name',
        type: 'varchar',
        length: 200,
        nullable: true
    })
    first_name!: string;

    @Column({
        name: 'last_name',
        type: 'varchar',
        length: 200,
        nullable: true
    })
    last_name!: string;

    @Column({
        name: 'email',
        type: 'varchar',
        length: 100,
        nullable: true
    })
    email!: string;
}
