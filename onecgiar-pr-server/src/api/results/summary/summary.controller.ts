import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Headers,
  HttpException,
  UseInterceptors,
} from '@nestjs/common';
import { SummaryService } from './summary.service';
import { InnovationUseDto } from './dto/create-innovation-use.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { CapdevDto } from './dto/create-capacity-developents.dto';
import { CreateInnovationDevDto } from './dto/create-innovation-dev.dto';
import { PolicyChangesDto } from './dto/create-policy-changes.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Patch('innovation-use/create/result/:resultId')
  saveInnovationUse(
    @Param('resultId') resultId: number,
    @Body() innovationUseDto: InnovationUseDto,
    @UserToken() user: TokenDto,
  ) {
    return this.summaryService.saveInnovationUse(
      innovationUseDto,
      resultId,
      user,
    );
  }

  @Get('innovation-use/get/result/:resultId')
  getInnovationUse(@Param('resultId') resultId: number) {
    return this.summaryService.getInnovationUse(resultId);
  }

  @Patch('capacity-developent/create/result/:resultId')
  saveCapacityDevelopents(
    @Param('resultId') resultId: number,
    @Body() capdevDto: CapdevDto,
    @UserToken() user: TokenDto,
  ) {
    return this.summaryService.saveCapacityDevelopents(
      capdevDto,
      resultId,
      user,
    );
  }

  @Get('capacity-developent/get/result/:resultId')
  getCapacityDevelopents(@Param('resultId') resultId: number) {
    return this.summaryService.getCapacityDevelopents(resultId);
  }

  @Patch('innovation-dev/create/result/:resultId')
  saveInnovationDev(
    @Param('resultId') resultId: number,
    @Body() createInnovationDevDto: CreateInnovationDevDto,
    @Body() innovationUseDto: InnovationUseDto,
    @UserToken() user: TokenDto,
  ) {
    return this.summaryService.saveInnovationDev(
      createInnovationDevDto,
      innovationUseDto,
      resultId,
      user,
    );
  }

  @Get('innovation-dev/get/result/:resultId')
  getInnovationDev(@Param('resultId') resultId: number) {
    return this.summaryService.getInnovationDev(resultId);
  }

  @Patch('policy-changes/create/result/:resultId')
  savePolicyChanges(
    @Param('resultId') resultId: number,
    @Body() policyChangesDto: PolicyChangesDto,
    @UserToken() user: TokenDto,
  ) {
    return this.summaryService.savePolicyChanges(
      policyChangesDto,
      resultId,
      user,
    );
  }

  @Get('policy-changes/get/result/:resultId')
  getPolicyChanges(@Param('resultId') resultId: number) {
    return this.summaryService.getPolicyChanges(resultId);
  }
}
