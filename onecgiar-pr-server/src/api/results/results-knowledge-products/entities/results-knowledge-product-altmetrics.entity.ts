import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { Version } from '../../../versioning/entities/version.entity';
import { ResultsKnowledgeProduct } from './results-knowledge-product.entity';

@Entity('results_kp_altmetrics')
export class ResultsKnowledgeProductAltmetric {
  @PrimaryGeneratedColumn({
    name: 'result_kp_altmetrics_id',
    type: 'bigint',
  })
  result_kp_altmetrics_id: number;

  @Column()
  result_knowledge_product_id: number;

  @Column({
    name: 'altmetric_id',
    type: 'bigint',
    nullable: true,
  })
  altmetric_id: string;

  get detail_url(): string {
    return this.altmetric_id
      ? `https://www.altmetric.com/details/${this.altmetric_id}`
      : undefined;
  }

  @Column({
    name: 'journal',
    type: 'text',
    nullable: true,
  })
  journal: string;

  @Column({
    name: 'score',
    type: 'bigint',
    nullable: true,
  })
  score: number;

  @Column({
    name: 'cited_by_posts',
    type: 'bigint',
    nullable: true,
  })
  cited_by_posts: number;

  @Column({
    name: 'cited_by_delicious',
    type: 'bigint',
    nullable: true,
  })
  cited_by_delicious: number;

  @Column({
    name: 'cited_by_facebook_pages',
    type: 'bigint',
    nullable: true,
  })
  cited_by_facebook_pages: number;

  @Column({
    name: 'cited_by_blogs',
    type: 'bigint',
    nullable: true,
  })
  cited_by_blogs: number;

  @Column({
    name: 'cited_by_forum_users',
    type: 'bigint',
    nullable: true,
  })
  cited_by_forum_users: number;

  @Column({
    name: 'cited_by_google_plus_users',
    type: 'bigint',
    nullable: true,
  })
  cited_by_google_plus_users: number;

  @Column({
    name: 'cited_by_linkedin_users',
    type: 'bigint',
    nullable: true,
  })
  cited_by_linkedin_users: number;

  @Column({
    name: 'cited_by_news_outlets',
    type: 'bigint',
    nullable: true,
  })
  cited_by_news_outlets: number;

  @Column({
    name: 'cited_by_peer_review_sites',
    type: 'bigint',
    nullable: true,
  })
  cited_by_peer_review_sites: number;

  @Column({
    name: 'cited_by_pinterest_users',
    type: 'bigint',
    nullable: true,
  })
  cited_by_pinterest_users: number;

  @Column({
    name: 'cited_by_policies',
    type: 'bigint',
    nullable: true,
  })
  cited_by_policies: number;

  @Column({
    name: 'cited_by_stack_exchange_resources',
    type: 'bigint',
    nullable: true,
  })
  cited_by_stack_exchange_resources: number;

  @Column({
    name: 'cited_by_reddit_users',
    type: 'bigint',
    nullable: true,
  })
  cited_by_reddit_users: number;

  @Column({
    name: 'cited_by_research_highlight_platforms',
    type: 'bigint',
    nullable: true,
  })
  cited_by_research_highlight_platforms: number;

  @Column({
    name: 'cited_by_twitter_users',
    type: 'bigint',
    nullable: true,
  })
  cited_by_twitter_users: number;

  @Column({
    name: 'cited_by_youtube_channels',
    type: 'bigint',
    nullable: true,
  })
  cited_by_youtube_channels: number;

  @Column({
    name: 'cited_by_weibo_users',
    type: 'bigint',
    nullable: true,
  })
  cited_by_weibo_users: number;

  @Column({
    name: 'cited_by_wikipedia_pages',
    type: 'bigint',
    nullable: true,
  })
  cited_by_wikipedia_pages: number;

  @Column({
    name: 'last_updated',
    type: 'timestamp',
    nullable: true,
  })
  last_updated: Date;

  @Column({
    name: 'image_small',
    type: 'text',
    nullable: true,
  })
  image_small: string;

  @Column({
    name: 'image_medium',
    type: 'text',
    nullable: true,
  })
  image_medium: string;

  @Column({
    name: 'image_large',
    type: 'text',
    nullable: true,
  })
  image_large: string;

  //audit fields
  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by: number;

  //object relations
  @ManyToOne(
    () => ResultsKnowledgeProduct,
    (r) => r.result_knowledge_product_altmetric_array,
  )
  @JoinColumn({
    name: 'result_knowledge_product_id',
  })
  result_knowledge_product_object: ResultsKnowledgeProduct;
}
