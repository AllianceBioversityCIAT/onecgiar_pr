import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  HttpException,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { HeadersDto } from '../../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

@Controller()
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) { }

  @Post('create/header')
  async create(@Body() createResultDto: CreateResultDto, @Headers() auth: HeadersDto) {
    const token: TokenDto = <TokenDto>JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString());
    const { message, response, status } = await this.resultsService.createOwnerResult(createResultDto, token);
    throw new HttpException({ message, response }, status);
  }

  @Get('get/name/:name')
  findAll(@Param('name') resultName: string) {
    return this.resultsService.findAll();
  }

  @Get('get/all-results')
  async findAllResults() {
    const { message, response, status } = await this.resultsService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get('get/initiatives/:userId')
  findInitiativesByUser(@Param('userId') userId: number) {
    return `aja ${userId}`;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultDto: UpdateResultDto) {
    return this.resultsService.update(+id, updateResultDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsService.remove(+id);
  }
}
