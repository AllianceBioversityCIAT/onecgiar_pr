import { Injectable } from '@nestjs/common';
import { CreateClarisaActionAreasOutcomesIndicatorDto } from './dto/create-clarisa-action-areas-outcomes-indicator.dto';
import { UpdateClarisaActionAreasOutcomesIndicatorDto } from './dto/update-clarisa-action-areas-outcomes-indicator.dto';

@Injectable()
export class ClarisaActionAreasOutcomesIndicatorsService {
  create(
    createClarisaActionAreasOutcomesIndicatorDto: CreateClarisaActionAreasOutcomesIndicatorDto,
  ) {
    return createClarisaActionAreasOutcomesIndicatorDto;
  }

  findAll() {
    return `This action returns all clarisaActionAreasOutcomesIndicators`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaActionAreasOutcomesIndicator`;
  }

  update(
    id: number,
    updateClarisaActionAreasOutcomesIndicatorDto: UpdateClarisaActionAreasOutcomesIndicatorDto,
  ) {
    return `This action updates a #${id} clarisaActionAreasOutcomesIndicator ${updateClarisaActionAreasOutcomesIndicatorDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaActionAreasOutcomesIndicator`;
  }
}
