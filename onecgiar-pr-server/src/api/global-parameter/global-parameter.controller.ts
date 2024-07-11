import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  Put,
  Body,
} from '@nestjs/common';
import { GlobalParameterService } from './global-parameter.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { UpdateGlobalParameterDto } from './dto/update-global-parameter.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class GlobalParameterController {
  constructor(
    private readonly globalParameterService: GlobalParameterService,
  ) {}

  @Get()
  findAll() {
    return this.globalParameterService.findAll();
  }

  @Get('category/:categoryId')
  findByCategoryId(@Param('categoryId') categoryId: string) {
    return this.globalParameterService.findByCategoryId(Number(categoryId));
  }

  @Get('platform/global/variables')
  getPlatformGlobalVariables() {
    return this.globalParameterService.getPlatformGlobalVariables();
  }

  @Get('name/:name')
  findByName(@Param('name') name: string) {
    return this.globalParameterService.findOneByName(name);
  }

  @Put('update/variable')
  updateVariable(
    @Body() updateGlobalParameterDto: UpdateGlobalParameterDto,
    @UserToken() user: TokenDto,
  ) {
    return this.globalParameterService.updateGlobalParameter(
      updateGlobalParameterDto,
      user,
    );
  }
}
