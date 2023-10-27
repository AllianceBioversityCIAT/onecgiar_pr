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

@Controller()
export class InnovationPathwayController {
  constructor(
    private readonly _innovationPathwayStepOneServiceService: InnovationPathwayStepOneService,
    private readonly _innovationPathwayStepTwoService: InnovationPathwayStepTwoService,
    private readonly _innovationPathwayStepThreeService: InnovationPathwayStepThreeService,
    private readonly _innovationPathwayStepFourService: InnovationPathwayStepFourService,
  ) {}

  // STEP ONE
  @Get('get-step-one/:resultId')
  async getStepOne(@Param('resultId') resultId: string) {
    const { message, response, status } =
      await this._innovationPathwayStepOneServiceService.getStepOne(+resultId);

    throw new HttpException({ message, response }, status);
  }

  @Patch('save/step-one/:resultId')
  async updateStepOne(
    @Param('resultId') resultId: string,
    @Body() updateInnovationPathwayDto: UpdateInnovationPathwayDto,
    @UserToken() user: TokenDto,
  ) {
    const { message, response, status } =
      await this._innovationPathwayStepOneServiceService.updateMain(
        +resultId,
        updateInnovationPathwayDto,
        user,
      );
    throw new HttpException({ message, response }, status);
  }

  @Patch('retrieve/aa-outcomes/:resultId')
  async updateStepOneInstitutions(
    @Param('resultId') resultId: string,
    @UserToken() user: TokenDto,
  ) {
    const { message, response, status } =
      await this._innovationPathwayStepOneServiceService.retrieveAaOutcomes(
        +resultId,
        user,
      );
    throw new HttpException({ message, response }, status);
  }

  // STEP TWO
  @Patch('save/step-two/:resultId')
  async updateSteptwo(
    @Param('resultId') resultId: string,
    @Body() saveData: SaveStepTwoOne,
    @UserToken() user: TokenDto,
  ) {
    const { message, response, status } =
      await this._innovationPathwayStepTwoService.saveSetepTowOne(
        +resultId,
        user,
        saveData.complementaryInovatins,
      );
    throw new HttpException({ message, response }, status);
  }

  @Post('save/complementary-innovation/:resultId')
  async saveComplementaryInnovation(
    @Param('resultId') resultId: string,
    @Body() createComplementaryInnovationDto: CreateComplementaryInnovationDto,
    @UserToken() User: TokenDto,
  ) {
    const { message, response, status } =
      await this._innovationPathwayStepTwoService.saveComplementaryInnovation(
        +resultId,
        User,
        createComplementaryInnovationDto,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get('get/complementary-innovation/:complementaryInnovationId')
  async getComplementaryInnovationById(
    @Param('complementaryInnovationId') complementaryInnovationId: number,
  ) {
    const { message, response, status } =
      await this._innovationPathwayStepTwoService.getComplementaryInnovationById(
        +complementaryInnovationId,
      );
    throw new HttpException({ message, response }, status);
  }

  @Patch('updated/complementary-innovation/:complementaryInnovationId')
  async updateComplementaryInnovation(
    @Param('complementaryInnovationId') complementaryInnovationId: number,
    @Body() updateComplementaryInnovationDto: UpdateComplementaryInnovationDto,
    @UserToken() User: TokenDto,
  ) {
    const { message, response, status } =
      await this._innovationPathwayStepTwoService.updateComplementaryInnovation(
        complementaryInnovationId,
        User,
        updateComplementaryInnovationDto,
      );
    throw new HttpException({ message, response }, status);
  }

  @Delete('delete/complementary-innovation/:complementaryInnovationId')
  async inactiveComplementaryInnovation(
    @Param('complementaryInnovationId') complementaryInnovationId: number,
    @UserToken() User: TokenDto,
  ) {
    const { message, response, status } =
      await this._innovationPathwayStepTwoService.inactiveComplementaryInnovation(
        +complementaryInnovationId,
        User,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get('get/step-two/:resultId')
  async getSteptwo(@Param('resultId') resultId: string) {
    const { message, response, status } =
      await this._innovationPathwayStepTwoService.getStepTwoOne(+resultId);
    throw new HttpException({ message, response }, status);
  }

  @Get('get/complementary-innovations')
  async getComplementaryInnovation() {
    const { message, response, status } =
      await this._innovationPathwayStepTwoService.findInnovationsAndComplementary();
    throw new HttpException({ message, response }, status);
  }

  @Get('get/complementary-innovations-functions')
  async getComplementaryInnovationFunctions() {
    const { message, response, status } =
      await this._innovationPathwayStepTwoService.findComplementaryInnovationFuctions();
    throw new HttpException({ message, response }, status);
  }

  // STEP THREE
  @Patch('save/step-three/:resultId')
  async updateStepthree(
    @Param('resultId') resultId: string,
    @Body() saveData: SaveStepTwoThree,
    @UserToken() user: TokenDto,
  ) {
    const { message, response, statusCode } =
      await this._innovationPathwayStepThreeService.saveComplementaryinnovation(
        +resultId,
        user,
        saveData,
      );
    throw new HttpException({ message, response }, statusCode);
  }

  @Get('get/step-three/:resultId')
  async getStepthree(@Param('resultId') resultId: string) {
    const { message, response, status } =
      await this._innovationPathwayStepThreeService.getStepThree(+resultId);
    throw new HttpException({ message, response }, status);
  }

  @Get('get/step-four/:resultId')
  async getStepFour(@Param('resultId') resultId: string) {
    const { message, response, status } =
      await this._innovationPathwayStepFourService.getStepFour(+resultId);
    throw new HttpException({ message, response }, status);
  }

  // STEP FOUR
  @Patch('save/step-four/:resultId')
  async updateStepFour(
    @Param('resultId') resultId: string,
    @Body() saveStepFourDto: SaveStepFour,
    @UserToken() user: TokenDto,
  ) {
    const { message, response, status } =
      await this._innovationPathwayStepFourService.saveMain(
        +resultId,
        user,
        saveStepFourDto,
      );
    throw new HttpException({ message, response }, status);
  }

  @Patch('save/step-four/partners/:resultId')
  async saveFourPartners(
    @Param('resultId') resultId: string,
    @Body() partners: institutionsInterface,
    @UserToken() user: TokenDto,
  ) {
    const { message, response, status } =
      await this._innovationPathwayStepFourService.savePartners(
        +resultId,
        user,
        partners,
      );
    throw new HttpException({ message, response }, status);
  }

  @Patch('save/step-four/bilaterals/:resultId')
  async saveFourBilaterals(
    @Param('resultId') resultId: string,
    @Body() bilaterals: donorInterfaceToc,
    @UserToken() user: TokenDto,
  ) {
    const { message, response, status } =
      await this._innovationPathwayStepFourService.saveBilaterals(
        +resultId,
        user,
        bilaterals,
      );
    throw new HttpException({ message, response }, status);
  }
}
