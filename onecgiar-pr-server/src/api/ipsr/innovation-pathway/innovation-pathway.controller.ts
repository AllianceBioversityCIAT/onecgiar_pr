import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InnovationPathwayStepOneService } from './innovation-pathway-step-one.service';
import { CreateInnovationPathwayDto } from './dto/create-innovation-pathway.dto';
import { UpdateInnovationPathwayDto } from './dto/update-innovation-pathway.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Controller()
export class InnovationPathwayController {
  constructor(private readonly _innovationPathwayStepOneServiceService: InnovationPathwayStepOneService) { }

  @Patch('step1/:resultId')
  update(
    @Param('resultId') resultId: string,
    @Body() updateInnovationPathwayDto: UpdateInnovationPathwayDto,
    @UserToken() user: TokenDto
  ) {
    return this._innovationPathwayStepOneServiceService.updateMain(+resultId, updateInnovationPathwayDto, user);
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
