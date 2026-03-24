import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { InnovationUseService } from './innovation-use.service';
import { CreateInnovationUseDto } from './dto/create-innovation-use.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@UseInterceptors(ResponseInterceptor)
@ApiTags('Results Framework and Reporting - Innovation Use')
export class InnovationUseController {
  constructor(private readonly innovationUseService: InnovationUseService) {}

  @Version('2')
  @Patch('/create/result/:resultId')
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

  @Version('2')
  @Get('/get/result/:resultId')
  getInnovationUse(@Param('resultId') resultId: number) {
    return this.innovationUseService.getInnovationUse(resultId);
  }
}
