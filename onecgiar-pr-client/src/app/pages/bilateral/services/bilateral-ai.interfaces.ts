export type BilateralAiJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface BilateralAiJob {
  job_id: string;
  project_id: number;
  program_code: string;
  status: BilateralAiJobStatus;
  error_message?: string;
  created_date: string;
  last_updated_date: string;
}

export type DraftEvidenceSourceType = 'DOCUMENT' | 'VOICE_NOTE' | 'TEXT_CONTEXT';

export interface DraftEvidence {
  id: number;
  draft_id: number;
  source_type: DraftEvidenceSourceType;
  file_name?: string;
  is_formal_evidence: boolean;
  created_date: string;
  pages?: number;
  duration?: number;
}

export interface ExtractedField {
  key: string;
  label: string;
  value: unknown;
  confidence: number;
  provenance: string;
  warning?: string;
}

export interface BilateralAiDraft {
  id: number;
  job_id: string;
  project_id: number;
  program_code: string;
  title: string;
  result_type_id?: number;
  status: 'draft' | 'promoted' | 'discarded';
  extracted_mds: Record<string, ExtractedField>;
  warnings: string[];
  completeness: number;
  text_context?: string;
  evidence: DraftEvidence[];
  created_date: string;
  last_updated_date: string;
}

export interface BilateralAiUploadState {
  jobId: string | null;
  status: 'idle' | 'uploading' | 'pending' | 'processing' | 'completed' | 'completed_no_candidates' | 'failed' | 'discarded' | 'promoted';
  errorMessage?: string;
  uploadProgress: number;
}
