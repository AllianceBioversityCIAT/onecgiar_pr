import {
  Controller,
  Body,
  Patch,
  Param,
  Version,
  Get,
  UseInterceptors,
} from '@nestjs/common';
import { IpsrGeneralInformationService } from './ipsr_general_information.service';
import { UpdateIpsrGeneralInformationDto } from './dto/update-ipsr_general_information.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@UseInterceptors(ResponseInterceptor)
@ApiTags('IPSR Framework - General information P25')
export class IpsrGeneralInformationController {
  constructor(
    private readonly ipsrGeneralInformationService: IpsrGeneralInformationService,
  ) {}

  @Version('2')
  @Patch('general-information/:resultId')
  generalInformation(
    @Param('resultId') resultId: number,
    @Body() updateGeneralInformationDto: UpdateIpsrGeneralInformationDto,
    @UserToken() user: TokenDto,
  ) {
    return this.ipsrGeneralInformationService.generalInformation(
      resultId,
      updateGeneralInformationDto,
      user,
    );
  }

  @Version('2')
  @Get('innovation/:resultId')
  findOne(@Param('resultId') resultId: number) {
    return this.ipsrGeneralInformationService.findOneInnovation(resultId);
  }
}
