import { Controller, UseInterceptors } from '@nestjs/common';
import { IpsrContributorsPartnersService } from './ipsr_contributors-partners.service';
import { ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@ApiTags('AI Review')
@UseInterceptors(ResponseInterceptor)
@Controller('ipsr-contributors-partners')
export class IpsrContributorsPartnersController {
  constructor(
    private readonly ipsrContributorsPartnersService: IpsrContributorsPartnersService,
  ) {}
}
