import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ResultLevel } from "../../result_levels/entities/result_level.entity";

@Entity()
export class ResultType {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column({
        name: 'name',
        type: 'varchar',
        length: 100,
        nullable: true
    })
    name!: string;

    @Column({
        name: 'description',
        type: 'varchar',
        length: 500,
        nullable: true
    })
    description!: string;

    @ManyToOne(() => ResultLevel, rl => rl.id, { nullable: false })
    @Column({
        name: 'result_level_id'
    })
    result_level_id: number;
}

