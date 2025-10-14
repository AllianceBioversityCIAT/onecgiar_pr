import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ContributorsPartnersService } from './contributors-partners.service';
import { ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
@ApiTags('Results Framework and Reporting - Contributors and Partners')
export class ContributorsPartnersController {
  constructor(
    private readonly contributorsPartnersService: ContributorsPartnersService,
  ) {}

  @Version('2')
  @Get(':resultId')
  getContributorsPartners(@Param('resultId') resultId: number) {
    return this.contributorsPartnersService.getContributorsPartnersByResultId(
      resultId,
    );
  }
}
