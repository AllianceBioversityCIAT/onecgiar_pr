import { CreateResultDto } from '../../dto/create-result.dto';
import { FullFairData } from './fair-data.dto';
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
  metadataCG: ResultsKnowledgeProductMetadataDto;
  metadataWOS: ResultsKnowledgeProductMetadataDto;
  //TODO remove when mapping is done
  //cgspace_regions: string;
  is_global_geoscope: boolean;
  cgspace_countries: string[];
  clarisa_regions: number[];
  //clarisa_countries: number[];
  handle: string;
  authors: ResultsKnowledgeProductAuthorDto[];
  type: string;
  licence: string;
  keywords: string[];
  agrovoc_keywords: string[];
  commodity: string;
  sponsor: string;
  altmetric_detail_url: string;
  altmetric_image_url: string;
  altmetric_full_data: ResultsKnowledgeProductAltmetricDto;
  references_other_knowledge_products: any;
  /*findable: number;
  accessible: number;
  interoperable: number;
  reusable: number;*/
  fair_data: FullFairData;
  is_melia?: boolean;
  melia_previous_submitted?: boolean;
  melia_type_id?: number;
  ost_melia_study_id?: number;
  result_data: CreateResultDto;
  warnings?: string[];
  cgspace_phase_year: number;
  result_code?: number;
  version_id?: number;
  modification_justification?: string;
  repo?: string;
}
