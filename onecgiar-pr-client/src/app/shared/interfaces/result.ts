export interface ResultLevel {
  id: number;
  name: string;
  description: string;
  result_type: Resulttype[];
}

export interface Resulttype {
  id: number;
  name: string;
  description: string;
  result_level_id: number;
}
