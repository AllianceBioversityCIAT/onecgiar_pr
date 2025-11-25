import { Controller, Get, Post, Body, Patch, Param, Delete, Version, UseInterceptors } from '@nestjs/common';
import { PathwayService } from './pathway.service';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { IpsrSaveStepFour } from './dto/ipsr-save-steo-four.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { IpsrPathwayStepFourService } from './ipsr-pathway-step-four.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { ApiTags } from '@nestjs/swagger/dist/decorators/api-use-tags.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
@ApiTags('IPSR Framework - Pathway')
export class PathwayController {
  constructor(
    private readonly _ipsrPathwayStepFourService: IpsrPathwayStepFourService,
  ) {}

  @Version('2')
  @Patch('save/step-four/:resultId')
  updateStepFour(
    @Param('resultId') resultId: string,
    @Body() saveStepFourDto: IpsrSaveStepFour,
    @UserToken() user: TokenDto,
  ) {
    return this._ipsrPathwayStepFourService.saveMain(
      +resultId,
      user,
      saveStepFourDto,
    );
  }

  @Version('2')
  @Get('get/step-four/:resultId')
    getStepFour(@Param('resultId') resultId: string) {
      return this._ipsrPathwayStepFourService.getStepFour(+resultId);
  }
}
