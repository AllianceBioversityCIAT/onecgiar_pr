import { Controller } from '@nestjs/common';
import { GlobalParameterService } from './global-parameter.service';

@Controller('global-parameter')
export class GlobalParameterController {
  constructor(private readonly globalParameterService: GlobalParameterService) {}
}
