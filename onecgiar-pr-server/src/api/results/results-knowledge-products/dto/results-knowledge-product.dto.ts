import { BasicInfoDto } from '../../../../shared/globalInterfaces/basic-info.dto';
import { ResultsKnowledgeProductAuthorDto } from './results-knowledge-product-author.dto';
import { ResultsKnowledgeProductInstitutionDto } from './results-knowledge-product-institution.dto';

export class ResultsKnowledgeProductDto {
  name: string;
  description: string;
  institutions: ResultsKnowledgeProductInstitutionDto[];
  regions: BasicInfoDto[];
  countries: BasicInfoDto[];
  handle: string;
  issue_year: number;
  authors: ResultsKnowledgeProductAuthorDto[];
  type: string;
  is_peer_reviewed: boolean;
  is_isi: boolean;
  doi: string;
  accessibility: string;
  licence: string;
  keywords: string[];
  agrovoc_keywords: string[];
  commodity: any;
  sponsor: any;
  altmetric_more_info_url: string;
  altmetric_image_url: string;
  references_other_knowledge_products: any;
  findable: number;
  accessible: number;
  interoperable: number;
  reusable: number;
}
