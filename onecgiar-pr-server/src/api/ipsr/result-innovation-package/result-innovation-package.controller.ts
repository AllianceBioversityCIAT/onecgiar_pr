import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
} from '@nestjs/common';
import { ResultInnovationPackageService } from './result-innovation-package.service';
import {
  CreateResultInnovationPackageDto,
  UpdateGeneralInformationDto,
} from './dto/create-result-innovation-package.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Controller()
export class ResultInnovationPackageController {
  constructor(
    private readonly resultInnovationPackageService: ResultInnovationPackageService,
  ) {}

  @Post('create-header')
  async createHeader(
    @Body() createResultInnovationPackageDto: CreateResultInnovationPackageDto,
    @UserToken() user: TokenDto,
  ) {
    const { message, response, status } =
      await this.resultInnovationPackageService.createHeader(
        createResultInnovationPackageDto,
        user,
      );

    throw new HttpException({ message, response }, status);
  }

  @Patch('general-information/:resultId')
  async generalInformation(
    @Param('resultId') resultId: number,
    @Body() updateGeneralInformationDto: UpdateGeneralInformationDto,
    @UserToken() user: TokenDto,
  ) {
    const { message, response, status } =
      await this.resultInnovationPackageService.generalInformation(
        resultId,
        updateGeneralInformationDto,
        user,
      );

    throw new HttpException({ message, response }, status);
  }

  @Get('active-backstopping')
  async findActiveBackstopping() {
    const { message, response, status } =
      await this.resultInnovationPackageService.findActiveBackstopping();
    throw new HttpException({ message, response }, status);
  }

  @Get('consensus-initiative-work-package')
  async findConsensusInitiativeWorkPackage() {
    const { message, response, status } =
      await this.resultInnovationPackageService.findConsensusInitiativeWorkPackage();
    throw new HttpException({ message, response }, status);
  }

  @Get('regional-integrated')
  async findRegionalIntegrated() {
    const { message, response, status } =
      await this.resultInnovationPackageService.findRegionalIntegrated();
    throw new HttpException({ message, response }, status);
  }

  @Get('regional-leadership')
  async findRegionalLeadership() {
    const { message, response, status } =
      await this.resultInnovationPackageService.findRegionalLeadership();
    throw new HttpException({ message, response }, status);
  }

  @Get('relevant-country')
  async findRelevantCountry() {
    const { message, response, status } =
      await this.resultInnovationPackageService.findRelevantCountry();

    throw new HttpException({ message, response }, status);
  }

  @Delete(':resultId')
  async delete(
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
  ) {
    const { message, response, status } =
      await this.resultInnovationPackageService.delete(resultId, user);

    throw new HttpException({ message, response }, status);
  }

  @Get('unit-time')
  async findUnitTime() {
    const { message, response, status } =
      await this.resultInnovationPackageService.findUnitTime();

    throw new HttpException({ message, response }, status);
  }
}
