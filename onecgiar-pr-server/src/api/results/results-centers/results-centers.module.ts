import { Module } from '@nestjs/common';
import { ResultsCentersService } from './results-centers.service';
import { ResultsCentersController } from './results-centers.controller';

@Module({
  controllers: [ResultsCentersController],
  providers: [ResultsCentersService]
})
export class ResultsCentersModule {}
