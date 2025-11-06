export interface AISession {
  id: string;
  result_id: string;
  opened_by: number;
  opened_at: string;
  closed_at: any;
  all_sections_completed: number;
  status: string;
}

export interface POSTAIAssistantSaveHistory {
  proposals: Proposal[];
}

export interface Proposal {
  field_name: string;
  original_text: string;
  proposed_text: string;
  needs_improvement: boolean;
}
