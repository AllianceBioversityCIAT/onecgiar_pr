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
  findable: number;
  accessible: number;
  interoperable: number;
  reusable: number;
  yearCG: number;
  is_peer_reviewed_CG: boolean;
  is_isi_CG: boolean;
  accessibility_CG: string;
  year_WOS: number;
  is_peer_reviewed_WOS: boolean;
  is_isi_WOS: boolean;
  accessibility_WOS: string;
  licence: string;
  warnings?: string[];
}
