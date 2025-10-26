import { Controller, Get, Body, Patch, Param } from '@nestjs/common';
import { InnovationUseService } from './innovation-use.service';
import { CreateInnovationUseDto } from './dto/create-innovation-use.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Controller('innovation-use')
export class InnovationUseController {
  constructor(private readonly innovationUseService: InnovationUseService) {}

  @Patch('innovation-use/create/result/:resultId')
  saveInnovationUse(
    @Param('resultId') resultId: number,
    @Body() innovationUseDto: CreateInnovationUseDto,
    @UserToken() user: TokenDto,
  ) {
    return this.innovationUseService.saveInnovationUse(
      innovationUseDto,
      resultId,
      user,
    );
  }

  @Get('innovation-use/get/result/:resultId')
  getInnovationUse(@Param('resultId') resultId: number) {
    return this.innovationUseService.getInnovationUse(resultId);
  }
  
}
