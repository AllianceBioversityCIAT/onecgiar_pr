export interface ClarisaProjectDto {
  id: number;
  short_name: string | null;
  full_name: string | null;
  summary: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: string | null;
  remaining: string | null;
  annual: string | null;
  source_of_funding: string | null;
  organization_code: number | null;
  funder_code: number | null;
  interim_director_review: string | null;
  project_results: string | null;
  modification_justification: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_active: boolean | null;
  created_by: number | null;
  updated_by: number | null;
}
