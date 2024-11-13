import { Module } from '@nestjs/common';
import { ResultQaedService } from './result-qaed.service';
import { ResultQaedController } from './result-qaed.controller';

@Module({
  controllers: [ResultQaedController],
  providers: [ResultQaedService],
})
export class ResultQaedModule {}
