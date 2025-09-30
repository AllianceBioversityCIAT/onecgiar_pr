import { Controller } from '@nestjs/common';
import { ClarisaGlobalUnitService } from './clarisa-global-unit.service';

@Controller('clarisa-global-unit')
export class ClarisaGlobalUnitController {
  constructor(private readonly clarisaGlobalUnitService: ClarisaGlobalUnitService) {}
}
