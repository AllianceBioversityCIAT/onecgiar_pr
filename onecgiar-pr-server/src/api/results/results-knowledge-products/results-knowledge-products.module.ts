import { Module } from '@nestjs/common';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';
import { ResultsKnowledgeProductsController } from './results-knowledge-products.controller';
import { ResultsKnowledgeProductsRepository } from './repositories/results-knowledge-products.repository';
import { ResultRepository } from '../result.repository';
import { MQAPService } from '../../m-qap/m-qap.service';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { HttpModule } from '@nestjs/axios';
import { ResultsKnowledgeProductMapper } from './results-knowledge-products.mapper';
import { ResultsKnowledgeProductAltmetricRepository } from './repositories/results-knowledge-product-altmetrics.repository';
import { ResultsKnowledgeProductAuthorRepository } from './repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductInstitutionRepository } from './repositories/results-knowledge-product-institution.repository';
import { ResultsKnowledgeProductKeywordRepository } from './repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductMetadataRepository } from './repositories/results-knowledge-product-metadata.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { YearRepository } from '../years/year.repository';
import { VersionsService } from '../versions/versions.service';
import { ResultLevelRepository } from '../result_levels/resultLevel.repository';
import { ResultByLevelRepository } from '../result-by-level/result-by-level.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ResultTypeRepository } from '../result_types/resultType.repository';
import { EvidencesRepository } from '../evidences/evidences.repository';
import { KnowledgeProductFairBaselineRepository } from '../knowledge_product_fair_baseline/knowledge_product_fair_baseline.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultRegionRepository } from '../result-regions/result-regions.repository';
import { ClarisaRegionsRepository } from '../../../clarisa/clarisa-regions/ClariasaRegions.repository';
import { CGSpaceCountryMappingsRepository } from './repositories/cgspace-country-mappings.repository';
import { ResultCountryRepository } from '../result-countries/result-countries.repository';
import { VersioningModule } from '../../versioning/versioning.module';
import { ClarisaCountriesRepository } from '../../../clarisa/clarisa-countries/ClarisaCountries.repository';
import { ResultsKnowledgeProductFairScoreRepository } from './repositories/results-knowledge-product-fair-scores.repository';
import { FairFieldRepository } from './repositories/fair-fields.repository';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';

@Module({
  imports: [HttpModule, VersioningModule],
  controllers: [ResultsKnowledgeProductsController],
  providers: [
    ResultsKnowledgeProductsService,
    HandlersError,
    ResultsKnowledgeProductsRepository,
    ResultRepository,
    MQAPService,
    VersionsService,
    ResultsKnowledgeProductMapper,
    ResultsKnowledgeProductAltmetricRepository,
    ResultsKnowledgeProductAuthorRepository,
    ResultsKnowledgeProductInstitutionRepository,
    ResultsKnowledgeProductKeywordRepository,
    ResultsKnowledgeProductMetadataRepository,
    ClarisaInitiativesRepository,
    ResultByLevelRepository,
    ResultLevelRepository,
    ResultTypeRepository,
    YearRepository,
    ResultByInitiativesRepository,
    EvidencesRepository,
    KnowledgeProductFairBaselineRepository,
    RoleByUserRepository,
    ResultRegionRepository,
    ClarisaRegionsRepository,
    CGSpaceCountryMappingsRepository,
    ResultCountryRepository,
    ClarisaCountriesRepository,
    ResultsKnowledgeProductFairScoreRepository,
    FairFieldRepository,
    ReturnResponse,
    ResultsCenterRepository,
    ClarisaInstitutionsRepository,
  ],
  exports: [
    ResultsKnowledgeProductsRepository,
    ResultRepository,
    MQAPService,
    VersionsService,
    ResultsKnowledgeProductMapper,
    ResultsKnowledgeProductAltmetricRepository,
    ResultsKnowledgeProductAuthorRepository,
    ResultsKnowledgeProductInstitutionRepository,
    ResultsKnowledgeProductKeywordRepository,
    ResultsKnowledgeProductMetadataRepository,
    ClarisaInitiativesRepository,
    ResultByLevelRepository,
    ResultLevelRepository,
    ResultTypeRepository,
    YearRepository,
    ResultByInitiativesRepository,
    EvidencesRepository,
    KnowledgeProductFairBaselineRepository,
    RoleByUserRepository,
    ResultRegionRepository,
    ClarisaRegionsRepository,
    CGSpaceCountryMappingsRepository,
    ResultCountryRepository,
    ClarisaCountriesRepository,
    ResultsKnowledgeProductFairScoreRepository,
    FairFieldRepository,
    ResultsCenterRepository,
    ClarisaInstitutionsRepository,
  ],
})
export class ResultsKnowledgeProductsModule {}
