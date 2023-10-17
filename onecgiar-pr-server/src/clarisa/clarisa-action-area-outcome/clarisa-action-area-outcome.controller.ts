import { Controller } from '@nestjs/common';
import { ClarisaActionAreaOutcomeService } from './clarisa-action-area-outcome.service';

@Controller()
export class ClarisaActionAreaOutcomeController {
  constructor(
    private readonly clarisaActionAreaOutcomeService: ClarisaActionAreaOutcomeService,
  ) {}
}
