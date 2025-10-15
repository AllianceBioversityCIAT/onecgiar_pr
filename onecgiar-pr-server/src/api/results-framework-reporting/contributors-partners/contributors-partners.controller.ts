import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ContributorsPartnersService } from './contributors-partners.service';
import { ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UpdateContributorsPartnersDto } from './dto/update-contributors-partners.dto';

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

  @Version('2')
  @Patch(':resultId')
  updateContributorsPartners(
    @Param('resultId') resultId: number,
    @Body() body: UpdateContributorsPartnersDto,
    @UserToken() user: TokenDto,
  ) {
    return this.contributorsPartnersService.updateContributorsAndPartners(
      resultId,
      body,
      user,
    );
  }
}
