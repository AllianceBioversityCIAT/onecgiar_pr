import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { ResultInnovationPackageService } from './result-innovation-package.service';
import {
  CreateResultInnovationPackageDto,
  UpdateGeneralInformationDto,
} from './dto/create-result-innovation-package.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultInnovationPackageController {
  constructor(
    private readonly resultInnovationPackageService: ResultInnovationPackageService,
  ) {}

  @Post('create-header')
  createHeader(
    @Body() createResultInnovationPackageDto: CreateResultInnovationPackageDto,
    @UserToken() user: TokenDto,
  ) {
    return this.resultInnovationPackageService.createHeader(
      createResultInnovationPackageDto,
      user,
    );
  }

  @Patch('general-information/:resultId')
  generalInformation(
    @Param('resultId') resultId: number,
    @Body() updateGeneralInformationDto: UpdateGeneralInformationDto,
    @UserToken() user: TokenDto,
  ) {
    return this.resultInnovationPackageService.generalInformation(
      resultId,
      updateGeneralInformationDto,
      user,
    );
  }

  @Get('active-backstopping')
  findActiveBackstopping() {
    return this.resultInnovationPackageService.findActiveBackstopping();
  }

  @Get('consensus-initiative-work-package')
  findConsensusInitiativeWorkPackage() {
    return this.resultInnovationPackageService.findConsensusInitiativeWorkPackage();
  }

  @Get('regional-integrated')
  findRegionalIntegrated() {
    return this.resultInnovationPackageService.findRegionalIntegrated();
  }

  @Get('regional-leadership')
  findRegionalLeadership() {
    return this.resultInnovationPackageService.findRegionalLeadership();
  }

  @Get('relevant-country')
  findRelevantCountry() {
    return this.resultInnovationPackageService.findRelevantCountry();
  }

  @Delete(':resultId')
  delete(@Param('resultId') resultId: number, @UserToken() user: TokenDto) {
    return this.resultInnovationPackageService.delete(resultId, user);
  }

  @Get('unit-time')
  findUnitTime() {
    return this.resultInnovationPackageService.findUnitTime();
  }
}
