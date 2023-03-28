import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { InnovationPathwayStepOneService } from './innovation-pathway-step-one.service';
import { CreateInnovationPathwayDto } from './dto/create-innovation-pathway.dto';
import { UpdateInnovationPathwayDto } from './dto/update-innovation-pathway.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { getInnovationComInterface } from '../ipsr.repository';
import { InnovationPathwayStepTwoService } from './innovation-pathway-step-two.service';
import { SaveStepTwoOne } from './dto/save-step-two-one.dto';

@Controller()
export class InnovationPathwayController {
  constructor(
    private readonly _innovationPathwayStepOneServiceService: InnovationPathwayStepOneService,
    private readonly _innovationPathwayStepTwoService: InnovationPathwayStepTwoService,
    ) { }

  @Patch('step-one/:resultId')
  async updateStepOne(
    @Param('resultId') resultId: string,
    @Body() updateInnovationPathwayDto: UpdateInnovationPathwayDto,
    @UserToken() user: TokenDto
  ) {
    const {message, response, status} = await this._innovationPathwayStepOneServiceService.updateMain(+resultId, updateInnovationPathwayDto, user);
    throw new HttpException({ message, response }, status);
  }

  @Patch('save/step-two/:resultId')
  async updateSteptwo(
    @Param('resultId') resultId: string,
    @Body() saveData: SaveStepTwoOne,
    @UserToken() user: TokenDto
  ) {
    const {message, response, status} = await this._innovationPathwayStepTwoService.saveSetepTowOne(+resultId, user, saveData.complementaryInovatins);
    throw new HttpException({ message, response }, status);
  }

  @Get('get/step-two/:resultId')
  async getSteptwo(
    @Param('resultId') resultId: string
  ) {
    const {message, response, status} = await this._innovationPathwayStepTwoService.getStepTwoOne(+resultId);
    throw new HttpException({ message, response }, status);
  }

  @Get('get/complementary-innovations')
  async getComplementaryInnovation() {
    const {message, response, status} = await this._innovationPathwayStepTwoService.findInnovationsAndComplementary();
    throw new HttpException({ message, response }, status);
  }

  // @Get()
  // findAll() {
  //   return this.innovationPathwayService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.innovationPathwayService.findOne(+id);
  // }


  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.innovationPathwayService.remove(+id);
  // }
}
