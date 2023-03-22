import { Module } from '@nestjs/common';
import { ResultIpEoiOutcomesService } from './result-ip-eoi-outcomes.service';
import { ResultIpEoiOutcomesController } from './result-ip-eoi-outcomes.controller';
import { ResultIpEoiOutcomeRepository } from './result-ip-eoi-outcomes.repository';

@Module({
  controllers: [ResultIpEoiOutcomesController],
  providers: [
    ResultIpEoiOutcomesService
  ]
})
export class ResultIpEoiOutcomesModule {}
