import { Module } from '@nestjs/common';
import { BilateralService } from './bilateral.service';
import { BilateralController } from './bilateral.controller';

@Module({
  controllers: [BilateralController],
  providers: [BilateralService],
})
export class BilateralModule {}
