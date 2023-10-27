import { Controller } from '@nestjs/common';
import { ClarisaActionAreasService } from './clarisa-action-areas.service';

@Controller()
export class ClarisaActionAreasController {
  constructor(
    private readonly clarisaActionAreasService: ClarisaActionAreasService,
  ) {}
}
