import { Module } from '@nestjs/common';
import { ResultScalingStudyUrlsService } from './result_scaling_study_urls.service';
import { ResultScalingStudyUrlsController } from './result_scaling_study_urls.controller';
import { ResultScalingStudyUrlsRepository } from './repositories/result_scaling_study_urls.repository';

@Module({
  controllers: [ResultScalingStudyUrlsController],
  providers: [ResultScalingStudyUrlsService, ResultScalingStudyUrlsRepository],
  exports: [ResultScalingStudyUrlsService, ResultScalingStudyUrlsRepository],
})
export class ResultScalingStudyUrlsModule {}
