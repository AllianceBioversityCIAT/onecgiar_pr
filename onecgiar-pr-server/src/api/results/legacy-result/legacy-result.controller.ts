import { Controller } from '@nestjs/common';
import { LegacyResultService } from './legacy-result.service';

@Controller('legacy-result')
export class LegacyResultController {
  constructor(private readonly legacyResultService: LegacyResultService) {}
}
