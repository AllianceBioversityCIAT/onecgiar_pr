import { BasicInfoDto } from '../../../../shared/globalInterfaces/basic-info.dto';
import { CreateResultDto } from '../../dto/create-result.dto';
import { ResultsKnowledgeProductAltmetricDto } from './results-knowledge-product-altmetric.dto';
import { ResultsKnowledgeProductAuthorDto } from './results-knowledge-product-author.dto';
import { ResultsKnowledgeProductInstitutionDto } from './results-knowledge-product-institution.dto';
import { ResultsKnowledgeProductMetadataDto } from './results-knowledge-product-metadata.dto';

export class ResultsKnowledgeProductDto {
  id: number;
  title: string;
  description: string;
  doi?: string;
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
  altmetric_full_data: ResultsKnowledgeProductAltmetricDto;
  references_other_knowledge_products: any;
  findable: number;
  accessible: number;
  interoperable: number;
  reusable: number;
  is_melia?: boolean;
  melia_previous_submitted?: boolean;
  melia_type_id?: number;
  result_data: CreateResultDto;
  warnings?: string[];
}
