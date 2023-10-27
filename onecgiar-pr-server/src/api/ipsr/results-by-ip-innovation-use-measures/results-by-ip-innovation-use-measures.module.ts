import { Module } from '@nestjs/common';
import { ResultsByIpInnovationUseMeasuresService } from './results-by-ip-innovation-use-measures.service';
import { ResultsByIpInnovationUseMeasuresController } from './results-by-ip-innovation-use-measures.controller';

@Module({
  controllers: [ResultsByIpInnovationUseMeasuresController],
  providers: [ResultsByIpInnovationUseMeasuresService],
})
export class ResultsByIpInnovationUseMeasuresModule {}
