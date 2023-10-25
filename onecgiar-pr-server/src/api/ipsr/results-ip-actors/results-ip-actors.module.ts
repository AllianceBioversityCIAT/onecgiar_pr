import { Module } from '@nestjs/common';
import { ResultsIpActorsService } from './results-ip-actors.service';
import { ResultsIpActorsController } from './results-ip-actors.controller';

@Module({
  controllers: [ResultsIpActorsController],
  providers: [ResultsIpActorsService],
})
export class ResultsIpActorsModule {}
