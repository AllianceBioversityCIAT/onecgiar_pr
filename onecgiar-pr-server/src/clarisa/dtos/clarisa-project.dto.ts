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
}
