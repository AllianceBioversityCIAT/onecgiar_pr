export type BilateralAiJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface BilateralAiJob {
  job_id: string;
  user_id: number;
  center_id: number | null;
  project_id: number;
  program_code: string;
  bucket_name: string;
  document_keys: string[];
  audio_keys: string[];
  text_context: string | null;
  status: BilateralAiJobStatus;
  attempts: number;
  external_interaction_id: string | null;
  response_snapshot: Record<string, unknown> | null;
  result_count: number;
  error_code: string | null;
  error_message: string | null;
  created_date: string;
  started_date: string | null;
  completed_date: string | null;
  last_updated_date: string;
}

export interface BilateralAiDraft {
  id: number;
  job_id: string;
  result_id: number;
  candidate_index: number;
  extracted_mds: Record<string, any> | null;
  candidate_snapshot: Record<string, any> | null;
  mapping_warnings: string[] | null;
  is_discarded: boolean;
  created_date: string;
  last_updated_date: string;
  job: BilateralAiJob;
}

export interface BilateralAiUploadState {
  jobId: string | null;
  status: 'idle' | 'uploading' | 'pending' | 'processing' | 'completed' | 'completed_no_candidates' | 'failed' | 'discarded' | 'promoted';
  errorMessage?: string;
  uploadProgress: number;
}
