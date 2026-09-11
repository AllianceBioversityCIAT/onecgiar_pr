import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BilateralAiDraft } from './bilateral-ai-draft.entity';

export enum DraftEvidenceSourceType {
  DOCUMENT = 'DOCUMENT',
  VOICE_NOTE = 'VOICE_NOTE',
  TEXT_CONTEXT = 'TEXT_CONTEXT',
}

@Entity('bilateral_ai_draft_evidence')
export class DraftEvidence {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'draft_id', type: 'bigint' })
  draft_id: number;

  @ManyToOne(() => BilateralAiDraft, { nullable: false })
  @JoinColumn({ name: 'draft_id' })
  draft: BilateralAiDraft;

  @Column({ name: 'source_type', type: 'varchar', length: 20 })
  source_type: DraftEvidenceSourceType;

  @Column({ name: 'object_key', type: 'text', nullable: true })
  object_key: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  file_name: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 120, nullable: true })
  mime_type: string | null;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  file_size: number | null;

  @Column({ name: 'is_formal_evidence', type: 'boolean', default: false })
  is_formal_evidence: boolean;

  @Column({ name: 'file_management_reference', type: 'text', nullable: true })
  file_management_reference: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_date', type: 'timestamp' })
  created_date: Date;

  @UpdateDateColumn({ name: 'last_updated_date', type: 'timestamp' })
  last_updated_date: Date;
}
