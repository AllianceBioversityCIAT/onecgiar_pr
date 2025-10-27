import { Module } from '@nestjs/common';
import { InnovationUseService } from './innovation-use.service';
import { InnovationUseController } from './innovation-use.controller';
import { SummaryModule } from '../../results/summary/summary.module';
import { ResultIpMeasuresModule } from '../../ipsr/result-ip-measures/result-ip-measures.module';
import { ResultsByInstitutionTypesModule } from '../../results/results_by_institution_types/results_by_institution_types.module';
import { ResultActorsModule } from '../../results/result-actors/result-actors.module';
import { LinkedResultsModule } from '../../results/linked-results/linked-results.module';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsModule } from '../../results/results.module';
import { ResultScalingStudyUrlsModule } from '../result_scaling_study_urls/result_scaling_study_urls.module';
import { ResultScalingStudyUrl } from '../result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResultScalingStudyUrl]),
    ResultsModule,
    ResultActorsModule,
    LinkedResultsModule,
    ResultsByInstitutionTypesModule,
    ResultIpMeasuresModule,
    SummaryModule,
    ResultScalingStudyUrlsModule,
  ],
  controllers: [InnovationUseController],
  providers: [InnovationUseService, HandlersError],
})
export class InnovationUseModule {}
