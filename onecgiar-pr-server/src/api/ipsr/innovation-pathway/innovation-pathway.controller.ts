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
import { InnovationPathwayStepOneService } from './innovation-pathway-step-one.service';
import {
  UpdateComplementaryInnovationDto,
  UpdateInnovationPathwayDto,
} from './dto/update-innovation-pathway.dto';
import { CreateComplementaryInnovationDto } from './dto/create-complementary-innovation.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { InnovationPathwayStepTwoService } from './innovation-pathway-step-two.service';
import { SaveStepTwoOne } from './dto/save-step-two-one.dto';
import { InnovationPathwayStepThreeService } from './innovation-pathway-step-three.service';
import { SaveStepTwoThree } from './dto/save-step-three.dto';
import { InnovationPathwayStepFourService } from './innovation-pathway-step-four.service';
import {
  donorInterfaceToc,
  institutionsInterface,
  SaveStepFour,
} from './dto/save-step-four.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class InnovationPathwayController {
  constructor(
    private readonly _innovationPathwayStepOneServiceService: InnovationPathwayStepOneService,
    private readonly _innovationPathwayStepTwoService: InnovationPathwayStepTwoService,
    private readonly _innovationPathwayStepThreeService: InnovationPathwayStepThreeService,
    private readonly _innovationPathwayStepFourService: InnovationPathwayStepFourService,
  ) {}

  // STEP ONE
  @Get('get-step-one/:resultId')
  getStepOne(@Param('resultId') resultId: string) {
    return this._innovationPathwayStepOneServiceService.getStepOne(+resultId);
  }

  @Patch('save/step-one/:resultId')
  updateStepOne(
    @Param('resultId') resultId: string,
    @Body() updateInnovationPathwayDto: UpdateInnovationPathwayDto,
    @UserToken() user: TokenDto,
  ) {
    return this._innovationPathwayStepOneServiceService.updateMain(
      +resultId,
      updateInnovationPathwayDto,
      user,
    );
  }

  @Patch('retrieve/aa-outcomes/:resultId')
  updateStepOneInstitutions(
    @Param('resultId') resultId: string,
    @UserToken() user: TokenDto,
  ) {
    return this._innovationPathwayStepOneServiceService.retrieveAaOutcomes(
      +resultId,
      user,
    );
  }

  // STEP TWO
  @Patch('save/step-two/:resultId')
  updateSteptwo(
    @Param('resultId') resultId: string,
    @Body() saveData: SaveStepTwoOne,
    @UserToken() user: TokenDto,
  ) {
    return this._innovationPathwayStepTwoService.saveSetepTowOne(
      +resultId,
      user,
      saveData.complementaryInovatins,
    );
  }

  @Post('save/complementary-innovation/:resultId')
  saveComplementaryInnovation(
    @Param('resultId') resultId: string,
    @Body() createComplementaryInnovationDto: CreateComplementaryInnovationDto,
    @UserToken() User: TokenDto,
  ) {
    return this._innovationPathwayStepTwoService.saveComplementaryInnovation(
      +resultId,
      User,
      createComplementaryInnovationDto,
    );
  }

  @Get('get/complementary-innovation/:complementaryInnovationId')
  getComplementaryInnovationById(
    @Param('complementaryInnovationId') complementaryInnovationId: number,
  ) {
    return this._innovationPathwayStepTwoService.getComplementaryInnovationById(
      +complementaryInnovationId,
    );
  }

  @Patch('updated/complementary-innovation/:complementaryInnovationId')
  updateComplementaryInnovation(
    @Param('complementaryInnovationId') complementaryInnovationId: number,
    @Body() updateComplementaryInnovationDto: UpdateComplementaryInnovationDto,
    @UserToken() User: TokenDto,
  ) {
    return this._innovationPathwayStepTwoService.updateComplementaryInnovation(
      complementaryInnovationId,
      User,
      updateComplementaryInnovationDto,
    );
  }

  @Delete('delete/complementary-innovation/:complementaryInnovationId')
  inactiveComplementaryInnovation(
    @Param('complementaryInnovationId') complementaryInnovationId: number,
    @UserToken() User: TokenDto,
  ) {
    return this._innovationPathwayStepTwoService.inactiveComplementaryInnovation(
      +complementaryInnovationId,
      User,
    );
  }

  @Get('get/step-two/:resultId')
  getSteptwo(@Param('resultId') resultId: string) {
    return this._innovationPathwayStepTwoService.getStepTwoOne(+resultId);
  }

  @Get('get/complementary-innovations')
  getComplementaryInnovation() {
    return this._innovationPathwayStepTwoService.findInnovationsAndComplementary();
  }

  @Get('get/complementary-innovations-functions')
  getComplementaryInnovationFunctions() {
    return this._innovationPathwayStepTwoService.findComplementaryInnovationFuctions();
  }

  // STEP THREE
  @Patch('save/step-three/:resultId')
  updateStepthree(
    @Param('resultId') resultId: string,
    @Body() saveData: SaveStepTwoThree,
    @UserToken() user: TokenDto,
  ) {
    return this._innovationPathwayStepThreeService.saveComplementaryinnovation(
      +resultId,
      user,
      saveData,
    );
  }

  @Get('get/step-three/:resultId')
  getStepthree(@Param('resultId') resultId: string) {
    return this._innovationPathwayStepThreeService.getStepThree(+resultId);
  }

  @Get('get/step-four/:resultId')
  getStepFour(@Param('resultId') resultId: string) {
    return this._innovationPathwayStepFourService.getStepFour(+resultId);
  }

  // STEP FOUR
  @Patch('save/step-four/:resultId')
  updateStepFour(
    @Param('resultId') resultId: string,
    @Body() saveStepFourDto: SaveStepFour,
    @UserToken() user: TokenDto,
  ) {
    return this._innovationPathwayStepFourService.saveMain(
      +resultId,
      user,
      saveStepFourDto,
    );
  }

  @Patch('save/step-four/partners/:resultId')
  saveFourPartners(
    @Param('resultId') resultId: string,
    @Body() partners: institutionsInterface,
    @UserToken() user: TokenDto,
  ) {
    return this._innovationPathwayStepFourService.savePartners(
      +resultId,
      user,
      partners,
    );
  }

  @Patch('save/step-four/bilaterals/:resultId')
  saveFourBilaterals(
    @Param('resultId') resultId: string,
    @Body() bilaterals: donorInterfaceToc,
    @UserToken() user: TokenDto,
  ) {
    return this._innovationPathwayStepFourService.saveBilaterals(
      +resultId,
      user,
      bilaterals,
    );
  }
}
