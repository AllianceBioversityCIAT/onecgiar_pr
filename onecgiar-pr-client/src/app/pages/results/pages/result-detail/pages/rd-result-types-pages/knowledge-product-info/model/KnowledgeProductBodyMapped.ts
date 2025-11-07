import { FullFairData } from './knowledgeProductBody';

export class KnowledgeProductBodyMapped {
  handle: string;
  authors: string[];
  type: string;
  doi: string;
  keywords: string;
  agrovoc_keywords: string;
  commodity: string;
  investors: string;
  altmetric_img_url: string;
  altmetric_details_url: string;
  references: string;
  onlineYearCG: number;
  yearCG: number;
  is_peer_reviewed_CG: string;
  is_isi_CG: string;
  accessibility_CG: string;
  year_WOS: number;
  is_peer_reviewed_WOS: string;
  is_isi_WOS: string;
  accessibility_WOS: string;
  licence: string;
  warnings?: string[];
  fair_data: FullFairData;
  isJournalArticle: boolean;
  source: string;
}
