import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ResultsKnowledgeProduct } from "../../results-knowledge-products/entities/results-knowledge-product.entity";

@Entity('knowledge_product_fair_baseline')
export class KnowledgeProductFairBaseline {
    @PrimaryGeneratedColumn({
        name: 'knowledge_product_fair_baseline_id',
        type: 'bigint'
    })
    knowledge_product_fair_baseline_id: number;

    @Column({
        name: 'findable',
        type: 'float',
        nullable: true,
    })
    findable: number;

    @Column({
        name: 'accesible',
        type: 'float',
        nullable: true,
    })
    accesible: number;

    @Column({
        name: 'interoperable',
        type: 'float',
        nullable: true,
    })
    interoperable: number;

    @Column({
        name: 'reusable',
        type: 'float',
        nullable: true,
    })
    reusable: number;

    @ManyToOne(() => ResultsKnowledgeProduct, (rkp) => rkp.result_knowledge_product_id)
    @JoinColumn({
      name: 'knowledge_product_id',
    })
    knowledge_product_id: number;
}
