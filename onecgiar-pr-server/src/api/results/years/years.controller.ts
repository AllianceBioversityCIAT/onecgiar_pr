import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { YearsService } from './years.service';
import { CreateYearDto } from './dto/create-year.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class YearsController {
  constructor(private readonly yearsService: YearsService) {}

  @Post('create/:year')
  async create(
    @UserToken() user: TokenDto,
    @Body() createYear: CreateYearDto,
    @Param('year') year: string,
  ) {
    return this.yearsService.create(year, user, createYear);
  }

  @Patch('active/:year')
  async findAll(@UserToken() user: TokenDto, @Param('year') year: string) {
    return this.yearsService.activeYear(year, user);
  }

  @Get()
  async findAllYear() {
    return this.yearsService.findAllYear();
  }
}
