export interface PredictedInstitutionDto {
  code: number;
  name: string;
  acronym: string;
  websiteLink: string;
  institutionTypeId: number;
  institutionType: string;
  hqLocation: string;
  hqLocationISOalpha2: string;
  institutionRelatedList?: any;
}

export interface Prediction {
  value: PredictedInstitutionDto;
  confidant: number;
}

export interface Affiliation {
  name: string;
  prediction: Prediction;
}

export interface AgrovocDetails {
  keyword: string;
  is_agrovoc: boolean;
}

export interface AgrovocKeywords {
  keywords: string[];
  results: AgrovocDetails[];
}

export interface Author {
  full_name: string;
}

export interface Organization {
  clarisa_id: number;
  name: string;
  country: string;
  full_address: string;
  confidant: number;
}

export interface DOIInfo {
  publication_type: string;
  volume: number;
  issue: number;
  is_isi: string;
  doi: string;
  oa_link: string;
  is_oa: string;
  source: string;
  publication_year: number;
  authors: Author[];
  title: string;
  journal_name: string;
  organizations: Organization[];
  altmetric?: any;
  gardian?: any;
  publication_sortdate: string;
  publication_coverdate: string;
  crossref: string;
}

export interface Score {
  total: number;
  F: number;
  A: number;
  I: number;
  R: number;
}

export interface FAIRDetails {
  name: string;
  description: string;
  valid: boolean;
}

export interface FAIR {
  score: Score;
  F: FAIRDetails[];
  A: FAIRDetails[];
  I: FAIRDetails[];
  R: FAIRDetails[];
}

export class MQAPResultDto {
  Title: string;
  Authors: string[];
  Handle: string;
  Keywords: string[];
  Description: string;
  Rights: string;
  'Open Access': string;
  DOI: string;
  'Publication Date': string;
  Countries: string;
  'Action Area': string;
  Affiliation: Affiliation[];
  'Impact Area': string;
  ORCID: string;
  'Region of the research': string;
  Type: string;
  ISI: string;
  'Peer-reviewed': string;
  Citation: string;
  Language: string;
  Journal: string;
  Pages: string;
  uuid: string;
  name: string;
  handle: string;
  thumbnail: string;
  repo: string;
  agrovoc_keywords: AgrovocKeywords;
  Commodities: string[];
  handle_altmetric?: any;
  DOI_Info: DOIInfo;
  FAIR: FAIR;
}
