import { Module } from '@nestjs/common';
import { ResultScalingStudyUrlsService } from './result_scaling_study_urls.service';
import { ResultScalingStudyUrlsController } from './result_scaling_study_urls.controller';

@Module({
  controllers: [ResultScalingStudyUrlsController],
  providers: [ResultScalingStudyUrlsService],
  exports: [ResultScalingStudyUrlsService],
})
export class ResultScalingStudyUrlsModule {}
