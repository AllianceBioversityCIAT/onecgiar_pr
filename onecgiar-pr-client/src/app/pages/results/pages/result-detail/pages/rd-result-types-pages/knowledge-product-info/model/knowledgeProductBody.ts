export class KnowledgeProductBody {
  id: string;
  accessible: number;
  commodity?: any;
  description: string;
  findable: number;
  handle: string;
  interoperable: number;
  licence: string;
  title: string;
  references_other_knowledge_products?: any;
  reusable: number;
  sponsor?: any;
  type: string;
  authors: Author[];
  agrovoc_keywords: string[];
  keywords: any[];
  metadata: Metadatum[];
  metadataCG: Metadatum;
  altmetric_detail_url: string;
  altmetric_image_url: string;
  institutions: Institution[];
  countries?: any;
  regions?: any;
  warnings: string[];
  metadataWOS: Metadatum;
}

interface Institution {
  confidence_percentage: number;
  possible_matched_institution_id: number;
  source_name: string;
}

interface Metadatum {
  source: string;
  accessibility: string;
  doi?: any;
  is_isi: boolean;
  is_peer_reviewed: boolean;
  issue_year: string;
}

interface Author {
  name: string;
  orcid?: any;
}
