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
  altmetric: AltmetricData;
  gardian: GardianData;
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
  Authors: string | string[];
  Handle: string;
  Keywords: string[];
  Description: string;
  Rights: string;
  'Open Access': string;
  DOI: string;
  'Publication Date': string;
  'Online publication date': string;
  'Issued date': string;
  Countries: string | string[];
  'Country ISO code': string | string[];
  'Action Area': string;
  Affiliation: Affiliation[];
  'Impact Area': string;
  ORCID: string;
  'Region of the research': CgRegion | CgRegion[];
  Type: string;
  ISI: string;
  'Peer-reviewed': string;
  'Funding source': Affiliation[];
  Citation: string;
  Language: string;
  Journal: string;
  Pages: string;
  uuid: string;
  name: string;
  handle: string;
  thumbnail: string;
  repo: string;
  'Geographic location': CgRegion | CgRegion[];
  agrovoc_keywords: AgrovocKeywords;
  'AGROVOC Keywords': AgrovocKeywords;
  Commodities: string[];
  handle_altmetric: AltmetricData;
  DOI_Info: DOIInfo;
  FAIR: FAIR;
}

export interface AltmetricImages {
  small: string;
  medium: string;
  large: string;
}

export interface AltmetricData {
  title: string;
  doi: string;
  pmid: string;
  altmetric_jid: string;
  issns: string[];
  journal: string;
  cohorts: any;
  context: any;
  authors: string[];
  type: string;
  handles: string[];
  pubdate: number;
  epubdate: number;
  handle: string;
  altmetric_id: string;
  schema: string;
  is_oa: boolean;
  publisher_subjects: any;
  cited_by_posts_count: number;
  cited_by_delicious_count: number;
  cited_by_forum_count: number;
  cited_by_gplus_count: number;
  cited_by_linkedin_count: number;
  cited_by_peer_review_sites_count: number;
  cited_by_pinners_count: number;
  cited_by_qs_count: number;
  cited_by_rdts_count: number;
  cited_by_rh_count: number;
  cited_by_videos_count: number;
  cited_by_weibo_count: number;
  cited_by_tweeters_count: number;
  cited_by_msm_count: number;
  cited_by_feeds_count: number;
  cited_by_fbwalls_count: number;
  cited_by_policies_count: number;
  cited_by_wikipedia_count: number;
  cited_by_accounts_count: number;
  last_updated: number;
  score: number;
  history: any;
  url: string;
  added_on: number;
  published_on: number;
  scopus_subjects: string[];
  readers: any;
  readers_count: number;
  images: AltmetricImages;
  details_url: string;
}

export interface GardianData {
  findability: string;
  accessibility: string;
  interoperability: string;
  reusability: string;
  title: string;
}

export interface CgRegion {
  name: string;
  clarisa_id: number;
}
