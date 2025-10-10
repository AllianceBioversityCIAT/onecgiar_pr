import { Controller } from '@nestjs/common';
import { BilateralService } from './bilateral.service';

@Controller()
export class BilateralController {
  constructor(private readonly bilateralService: BilateralService) {}
}
