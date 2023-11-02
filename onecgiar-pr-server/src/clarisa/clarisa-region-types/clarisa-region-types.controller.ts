import { Controller } from '@nestjs/common';
import { ClarisaRegionTypesService } from './clarisa-region-types.service';

@Controller('clarisa-region-types')
export class ClarisaRegionTypesController {
  constructor(private readonly regionTypesService: ClarisaRegionTypesService) {}
}
