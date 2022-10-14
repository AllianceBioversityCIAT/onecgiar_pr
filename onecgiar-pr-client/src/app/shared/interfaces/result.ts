export interface ResultLevel {
  id: number;
  name: string;
  description: string;
  result_type: Resulttype[];
  selected: boolean;
}

export interface Resulttype {
  id: number;
  name: string;
  description: string;
  result_level_id: number;
}

export class ResultBody {
  public initiative_id: number = null;
  public result_type_id: number = null;
  public result_name: string = '';
  public handle: string = '';
}

export interface ResultItem {
  id: string;
  title: string;
  reported_year_id?: any;
  result_level_name: string;
  created_date: string;
  submitter: string;
  status: number;
  status_name: string;
}
