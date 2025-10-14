export class KnowledgeProductBody {
  id: string;
  commodity?: any;
  description: string;
  handle: string;
  licence: string;
  title: string;
  references_other_knowledge_products?: any;
  sponsor?: any;
  type: string;
  authors: Author[];
  agrovoc_keywords: string[];
  keywords: any[];
  metadata: Metadatum[];
  metadataCG: Metadatum;
  metadataWOS: Metadatum;
  altmetric_detail_url: string;
  altmetric_image_url: string;
  institutions: Institution[];
  countries?: any;
  regions?: any;
  is_melia: boolean;
  melia_previous_submitted: boolean;
  melia_type_id: number;
  ost_melia_study_id: number;
  warnings: string[];
  cgspace_phase_year: number;
  fair_data: FullFairData;
  repo?: string;
}

interface Institution {
  confidence_percentage: number;
  possible_matched_institution_id: number;
  source_name: string;
}

interface Metadatum {
  source: string;
  accessibility: string | boolean;
  doi?: any;
  is_isi: boolean;
  is_peer_reviewed: boolean;
  issue_year: number;
  online_year: number;
}

interface Author {
  name: string;
  orcid?: any;
}

export class FullFairData {
  total_score: number;
  F: FairSpecificData;
  A: FairSpecificData;
  I: FairSpecificData;
  R: FairSpecificData;
}

export class FairSpecificData {
  name?: string;
  description?: string;
  score: number;
  indicators?: FairSpecificData[];
}
