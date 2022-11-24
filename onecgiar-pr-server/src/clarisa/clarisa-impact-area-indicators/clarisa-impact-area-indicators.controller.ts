import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClarisaImpactAreaIndicatorsService } from './clarisa-impact-area-indicators.service';
import { CreateClarisaImpactAreaIndicatorDto } from './dto/create-clarisa-impact-area-indicator.dto';
import { UpdateClarisaImpactAreaIndicatorDto } from './dto/update-clarisa-impact-area-indicator.dto';
import { HttpException } from '@nestjs/common';

@Controller()
export class ClarisaImpactAreaIndicatorsController {
  constructor(
    private readonly clarisaImpactAreaIndicatorsService: ClarisaImpactAreaIndicatorsService,
  ) {}

  @Post()
  create(
    @Body()
    createClarisaImpactAreaIndicatorDto: CreateClarisaImpactAreaIndicatorDto,
  ) {
    return this.clarisaImpactAreaIndicatorsService.create(
      createClarisaImpactAreaIndicatorDto,
    );
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaImpactAreaIndicatorsService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaImpactAreaIndicatorsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateClarisaImpactAreaIndicatorDto: UpdateClarisaImpactAreaIndicatorDto,
  ) {
    return this.clarisaImpactAreaIndicatorsService.update(
      +id,
      updateClarisaImpactAreaIndicatorDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaImpactAreaIndicatorsService.remove(+id);
  }
}
