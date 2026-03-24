import { Controller } from '@nestjs/common';
import { IpsrFrameworkService } from './ipsr-framework.service';

@Controller('ipsr-framework')
export class IpsrFrameworkController {
  constructor(private readonly ipsrFrameworkService: IpsrFrameworkService) {}
}
