import { Module } from '@nestjs/common';
import { ResultImpactAreaScoresService } from './result-impact-area-scores.service';
import { ResultImpactAreaScoresController } from './result-impact-area-scores.controller';

@Module({
  controllers: [ResultImpactAreaScoresController],
  providers: [ResultImpactAreaScoresService],
  exports: [ResultImpactAreaScoresService],
})
export class ResultImpactAreaScoresModule {}
