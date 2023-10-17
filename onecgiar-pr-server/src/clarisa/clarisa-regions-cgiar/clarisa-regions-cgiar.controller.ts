import { Controller } from '@nestjs/common';
import { ClarisaRegionsCgiarService } from './clarisa-regions-cgiar.service';

@Controller('clarisa-regions-cgiar')
export class ClarisaRegionsCgiarController {
  constructor(
    private readonly clarisaRegionsCgiarService: ClarisaRegionsCgiarService,
  ) {}
}
