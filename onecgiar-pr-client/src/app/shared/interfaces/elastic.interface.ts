export interface Shards {
  total: number;
  successful: number;
  skipped: number;
  failed: number;
}

export interface Total {
  value: number;
  relation: string;
}

export interface Source {
  id: string;
  title: string;
  description: string;
  crp: string;
  countries: string;
  regions: string;
  year: number;
  type: string;
  is_legacy: string;
}

export interface Hit {
  _index: string;
  _id: string;
  _score: number;
  _source: Source;
}

export interface Hits {
  total: Total;
  max_score: number;
  hits: Hit[];
}

export interface ElasticResult {
  took: number;
  timed_out: boolean;
  _shards: Shards;
  hits: Hits;
}
