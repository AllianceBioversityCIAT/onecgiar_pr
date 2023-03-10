import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { IpsrService } from './ipsr.service';
import { CreateIpsrDto } from './dto/create-ipsr.dto';
import { UpdateIpsrDto } from './dto/update-ipsr.dto';
import { dataSource } from '../../config/orm.config';
import { Result } from '../results/entities/result.entity';

@Controller()
export class IpsrController {
  constructor(private readonly ipsrService: IpsrService) { }

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

  @Get('all-innovation-packages')
  async allInnovationPackages() {
    const { message, response, status }
      = await this.ipsrService.allInnovationPackages();

    throw new HttpException({ message, response }, status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ipsrService.remove(+id);
  }
}
