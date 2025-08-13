import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ContributionToIndicatorsService } from './contribution-to-indicators.service';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ContributionToIndicatorsDto } from './dto/contribution-to-indicators.dto';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ContributionToIndicatorsController {
  constructor(
    private readonly contributionToIndicatorsService: ContributionToIndicatorsService,
  ) {}

  @Post()
  create(@Query('tocId') tocId: string, @UserToken() user: TokenDto) {
    return this.contributionToIndicatorsService.create(tocId, user);
  }

  @Post('change-submission-state')
  changeSubmissionState(
    @Query('tocId') tocId: string,
    @UserToken() user: TokenDto,
  ) {
    return this.contributionToIndicatorsService.changeSubmissionState(
      user,
      tocId,
    );
  }

  @Get('outcomes/:initiativeCode')
  findAllOutcomesByInitiativeCode(
    @Param('initiativeCode') initiativeCode: string,
  ) {
    return this.contributionToIndicatorsService.findAllToCResultsByInitiativeCode(
      initiativeCode,
      true,
    );
  }

  @Get('eois/:initiativeCode')
  findAllEoIsByInitiativeCode(@Param('initiativeCode') initiativeCode: string) {
    return this.contributionToIndicatorsService.findAllToCResultsByInitiativeCode(
      initiativeCode,
      false,
    );
  }

  @Get('get/indicator/:tocId')
  findOneCoIResultByTocId(@Param('tocId') tocId: string) {
    return this.contributionToIndicatorsService.findOneCoIResultByTocId(tocId);
  }

  @Get('get/full-report')
  getAllEoIsWps() {
    return this.contributionToIndicatorsService.getAllFromInitiatives();
  }

  @Patch()
  update(
    @Body() updateContributionToIndicatorDto: ContributionToIndicatorsDto,
    @UserToken() user: TokenDto,
  ) {
    return this.contributionToIndicatorsService.update(
      updateContributionToIndicatorDto,
      user,
    );
  }
}
