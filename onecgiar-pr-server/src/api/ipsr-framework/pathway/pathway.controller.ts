import { Controller, Get, Post, Body, Patch, Param, Delete, Version } from '@nestjs/common';
import { PathwayService } from './pathway.service';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { IpsrSaveStepFour } from './dto/ipsr-save-steo-four.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { IpsrPathwayStepFourService } from './ipsr-pathway-step-four.service';

@Controller('pathway')
export class PathwayController {
  constructor(
    private readonly pathwayService: PathwayService,
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
}
