import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { IpsrContributorsPartnersService } from './ipsr_contributors-partners.service';
import { ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UpdateContributorsPartnersDto } from './dto/update-contributors-partners.dto';

@Controller()
@UseInterceptors(ResponseInterceptor)
@ApiTags('IPSR Framework - Contributors and Partners')
export class IpsrContributorsPartnersController {
  constructor(
    private readonly ipsrContributorsPartnersService: IpsrContributorsPartnersService,
  ) {}

  @Version('2')
  @Get(':resultId')
  getContributorsPartners(@Param('resultId') resultId: number) {
    return this.ipsrContributorsPartnersService.getContributorsPartnersByResultId(
      resultId,
    );
  }

  @Version('2')
  @Patch(':resultId')
  updateContributorsPartners(
    @Param('resultId') resultId: number,
    @Body() body: UpdateContributorsPartnersDto,
    @UserToken() user: TokenDto,
  ) {
    return this.ipsrContributorsPartnersService.updateContributorsAndPartners(
      resultId,
      body,
      user,
    );
  }
}
