import { BasicInfoDto } from '../../../../shared/globalInterfaces/basic-info.dto';
import { ResultsKnowledgeProductAuthorDto } from './results-knowledge-product-author.dto';
import { ResultsKnowledgeProductInstitutionDto } from './results-knowledge-product-institution.dto';
import { ResultsKnowledgeProductMetadataDto } from './results-knowledge-product-metadata.dto';

export class ResultsKnowledgeProductDto {
  id: number;
  name: string;
  description: string;
  institutions: ResultsKnowledgeProductInstitutionDto[];
  metadata: ResultsKnowledgeProductMetadataDto[];
  regions: BasicInfoDto[];
  countries: BasicInfoDto[];
  handle: string;
  authors: ResultsKnowledgeProductAuthorDto[];
  type: string;
  licence: string;
  keywords: string[];
  agrovoc_keywords: string[];
  commodity: any;
  sponsor: any;
  altmetric_detail_url: string;
  altmetric_image_url: string;
  references_other_knowledge_products: any;
  findable: number;
  accessible: number;
  interoperable: number;
  reusable: number;
}
