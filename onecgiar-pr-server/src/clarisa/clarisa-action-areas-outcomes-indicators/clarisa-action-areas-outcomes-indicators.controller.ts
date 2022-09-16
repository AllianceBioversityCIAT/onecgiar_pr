import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClarisaActionAreasOutcomesIndicatorsService } from './clarisa-action-areas-outcomes-indicators.service';
import { CreateClarisaActionAreasOutcomesIndicatorDto } from './dto/create-clarisa-action-areas-outcomes-indicator.dto';
import { UpdateClarisaActionAreasOutcomesIndicatorDto } from './dto/update-clarisa-action-areas-outcomes-indicator.dto';

@Controller()
export class ClarisaActionAreasOutcomesIndicatorsController {
  constructor(
    private readonly clarisaActionAreasOutcomesIndicatorsService: ClarisaActionAreasOutcomesIndicatorsService,
  ) {}

  @Post()
  create(
    @Body()
    createClarisaActionAreasOutcomesIndicatorDto: CreateClarisaActionAreasOutcomesIndicatorDto,
  ) {
    return this.clarisaActionAreasOutcomesIndicatorsService.create(
      createClarisaActionAreasOutcomesIndicatorDto,
    );
  }

  @Get()
  findAll() {
    return this.clarisaActionAreasOutcomesIndicatorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaActionAreasOutcomesIndicatorsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateClarisaActionAreasOutcomesIndicatorDto: UpdateClarisaActionAreasOutcomesIndicatorDto,
  ) {
    return this.clarisaActionAreasOutcomesIndicatorsService.update(
      +id,
      updateClarisaActionAreasOutcomesIndicatorDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaActionAreasOutcomesIndicatorsService.remove(+id);
  }
}
