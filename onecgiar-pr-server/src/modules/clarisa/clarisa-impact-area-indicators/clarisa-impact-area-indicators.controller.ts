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

  @Get()
  findAll() {
    return this.clarisaImpactAreaIndicatorsService.findAll();
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
