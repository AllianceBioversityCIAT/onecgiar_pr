import { Module } from '@nestjs/common';
import { UnitsOfMeasureService } from './units-of-measure.service';
import { UnitsOfMeasureController } from './units-of-measure.controller';

@Module({
  controllers: [UnitsOfMeasureController],
  providers: [UnitsOfMeasureService],
})
export class UnitsOfMeasureModule {}
