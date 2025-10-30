import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Version,
  UseInterceptors,
} from '@nestjs/common';
import { InnovationDevService } from './innovation_dev.service';
import { CreateInnovationDevDtoV2 } from './dto/create-innovation_dev.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { InnovationUseDto } from '../../results/summary/dto/create-innovation-use.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@UseInterceptors(ResponseInterceptor)
@ApiTags('Results Framework and Reporting - Innovation Development')
export class InnovationDevController {
  constructor(private readonly innovationDevService: InnovationDevService) {}

  @Version('2')
  @Patch('innovation-dev/create/result/:resultId')
  saveInnovationDev(
    @Param('resultId') resultId: number,
    @Body() createInnovationDevDto: CreateInnovationDevDtoV2,
    @Body() innovationUseDto: InnovationUseDto,
    @UserToken() user: TokenDto,
  ) {
    return this.innovationDevService.saveInnovationDev(
      createInnovationDevDto,
      innovationUseDto,
      resultId,
      user,
    );
  }

  @Version('2')
  @Get('innovation-dev/get/result/:resultId')
  getInnovationDev(@Param('resultId') resultId: number) {
    return this.innovationDevService.getInnovationDev(resultId);
  }
}
