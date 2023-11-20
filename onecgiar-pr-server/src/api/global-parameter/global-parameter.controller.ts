import { Controller, Get, Param, Post } from '@nestjs/common';
import { GlobalParameterService } from './global-parameter.service';

@Controller()
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
}
