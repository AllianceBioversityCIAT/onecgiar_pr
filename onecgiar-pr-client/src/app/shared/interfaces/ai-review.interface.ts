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

export interface POSTPRMSQa {
  user_id: string;
  result_metadata: any;
}

export interface IAiRecommendation {
  time_taken: string;
  json_content: JsonContent;
  interaction_id: string;
}

export interface JsonContent {
  new_title: string;
  new_description: string;
  short_name: string;
  impact_area_scores: ImpactAreaScores;
}

export interface ImpactAreaScores {
  social_inclusion: string;
  social_inclusion_component: string;
  climate_adaptation: string;
  food_security: string;
  food_security_component: string;
  environmental_health: string;
  poverty_reduction: string;
}

export interface POSTAIAssistantCreateEvent {
  session_id: number | string;
  result_id: number | string;
  event_type: string;
  field_name: string;
}

export interface SaveProposal {
  fields: POSTSaveProposalField[];
}

export interface POSTSaveProposalField {
  field_name: string;
  new_value: string;
  change_reason: string;
  was_ai_suggested: boolean;
  user_feedback?: string;
  // aux
  proposed_text?: string;
  original_text?: string;
}
