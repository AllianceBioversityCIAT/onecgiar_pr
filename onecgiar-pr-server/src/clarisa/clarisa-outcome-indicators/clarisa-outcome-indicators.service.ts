import { Injectable } from '@nestjs/common';
import { CreateClarisaOutcomeIndicatorDto } from './dto/create-clarisa-outcome-indicator.dto';
import { UpdateClarisaOutcomeIndicatorDto } from './dto/update-clarisa-outcome-indicator.dto';

@Injectable()
export class ClarisaOutcomeIndicatorsService {
  create(createClarisaOutcomeIndicatorDto: CreateClarisaOutcomeIndicatorDto) {
    return 'This action adds a new clarisaOutcomeIndicator';
  }

  findAll() {
    return `This action returns all clarisaOutcomeIndicators`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaOutcomeIndicator`;
  }

  update(
    id: number,
    updateClarisaOutcomeIndicatorDto: UpdateClarisaOutcomeIndicatorDto,
  ) {
    return `This action updates a #${id} clarisaOutcomeIndicator`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaOutcomeIndicator`;
  }
}
