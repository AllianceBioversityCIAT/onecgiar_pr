import { Controller } from '@nestjs/common';
import { UnitsOfMeasureService } from './units-of-measure.service';

@Controller('units-of-measure')
export class UnitsOfMeasureController {
  constructor(private readonly unitsOfMeasureService: UnitsOfMeasureService) {}
}
