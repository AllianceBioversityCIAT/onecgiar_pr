import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { YearsService } from './years.service';
import { CreateYearDto } from './dto/create-year.dto';
import { UpdateYearDto } from './dto/update-year.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { HttpException } from '@nestjs/common';

@Controller()
export class YearsController {
  constructor(private readonly yearsService: YearsService) { }

  @Post('create/:year')
  async create(
    @UserToken() user: TokenDto,
    @Body() createYear: CreateYearDto,
    @Param('year') year: string
  ) {
    const { message, response, status } =
      await this.yearsService.create(year, user, createYear);
    throw new HttpException({ message, response }, status);
  }

  @Patch('active/:year')
  async findAll(
    @UserToken() user: TokenDto,
    @Param('year') year: string
  ) {
    const { message, response, status } =
      await this.yearsService.activeYear(year, user);
    throw new HttpException({ message, response }, status);
  }
}
