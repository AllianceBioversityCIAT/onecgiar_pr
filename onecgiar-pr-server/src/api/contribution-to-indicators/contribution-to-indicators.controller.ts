import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ContributionToIndicatorsService } from './contribution-to-indicators.service';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ContributionToIndicatorsDto } from './dto/contribution-to-indicators.dto';

@Controller()
export class ContributionToIndicatorsController {
  constructor(
    private readonly contributionToIndicatorsService: ContributionToIndicatorsService,
  ) {}

  @Post()
  create(@Query('tocId') tocId: string, @UserToken() user: TokenDto) {
    return this.contributionToIndicatorsService.create(tocId, user);
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

  @Get('get/:tocId')
  findOne(@Param('tocId') tocId: string) {
    return this.contributionToIndicatorsService.findOne(tocId);
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
