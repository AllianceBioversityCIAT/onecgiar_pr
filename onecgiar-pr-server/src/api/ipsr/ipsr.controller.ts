import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { IpsrService } from './ipsr.service';
import { CreateIpsrDto } from './dto/create-ipsr.dto';
import { UpdateIpsrDto } from './dto/update-ipsr.dto';
import { dataSource } from '../../config/orm.config';
import { Result } from '../results/entities/result.entity';

@Controller()
export class IpsrController {
  constructor(private readonly ipsrService: IpsrService) { }

  @Post()
  create(@Body() createIpsrDto: CreateIpsrDto) {
    return this.ipsrService.create(createIpsrDto);
  }

  @Get('all-innovations')
  async findAll() {
    const { message, response, status } =
      await this.ipsrService.findAllInnovations();

    throw new HttpException({ message, response }, status);
  }

  @Get('innovation/:resultId')
  async findOne(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.ipsrService.findOneInnovation(resultId);

    throw new HttpException({ message, response }, status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateIpsrDto: UpdateIpsrDto) {
    return this.ipsrService.update(+id, updateIpsrDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ipsrService.remove(+id);
  }
}
