import { Controller } from '@nestjs/common';
import { ClarisaSdgsService } from './clarisa-sdgs.service';

@Controller('clarisa-sdgs')
export class ClarisaSdgsController {
  constructor(private readonly clarisaSdgsService: ClarisaSdgsService) {}
}
