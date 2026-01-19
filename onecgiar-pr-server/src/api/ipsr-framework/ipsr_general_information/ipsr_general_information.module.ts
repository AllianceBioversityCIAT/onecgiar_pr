import { forwardRef, Module } from '@nestjs/common';
import { IpsrGeneralInformationService } from './ipsr_general_information.service';
import { IpsrGeneralInformationController } from './ipsr_general_information.controller';
import { ResultsInvestmentDiscontinuedOptionRepository } from '../../results/results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ImpactAreasScoresComponentRepository } from '../../results/impact_areas_scores_components/repositories/impact_areas_scores_components.repository';
import { IpsrRepository } from '../../ipsr/ipsr.repository';
import { GenderTagRepository } from '../../results/gender_tag_levels/genderTag.repository';
import { IpsrService } from '../../ipsr/ipsr.service';
import { AdUsersModule } from '../../ad_users';
import { VersioningModule } from '../../versioning/versioning.module';
import { InitiativeEntityMapRepository } from '../../initiative_entity_map/initiative_entity_map.repository';

@Module({
  controllers: [IpsrGeneralInformationController],
  providers: [
    IpsrGeneralInformationService,
    ResultsInvestmentDiscontinuedOptionRepository,
    ResultRepository,
    HandlersError,
    ImpactAreasScoresComponentRepository,
    InitiativeEntityMapRepository,
    IpsrRepository,
    GenderTagRepository,
    IpsrService,
  ],
  imports: [forwardRef(() => VersioningModule), AdUsersModule],
})
export class IpsrGeneralInformationModule {}
