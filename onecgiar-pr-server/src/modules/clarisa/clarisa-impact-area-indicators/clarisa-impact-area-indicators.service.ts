import { Injectable } from '@nestjs/common';
import { CreateClarisaImpactAreaIndicatorDto } from './dto/create-clarisa-impact-area-indicator.dto';
import { UpdateClarisaImpactAreaIndicatorDto } from './dto/update-clarisa-impact-area-indicator.dto';

@Injectable()
export class ClarisaImpactAreaIndicatorsService {
  create(createClarisaImpactAreaIndicatorDto: CreateClarisaImpactAreaIndicatorDto) {
    return 'This action adds a new clarisaImpactAreaIndicator';
  }

  findAll() {
    return `This action returns all clarisaImpactAreaIndicators`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaImpactAreaIndicator`;
  }

  update(id: number, updateClarisaImpactAreaIndicatorDto: UpdateClarisaImpactAreaIndicatorDto) {
    return `This action updates a #${id} clarisaImpactAreaIndicator`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaImpactAreaIndicator`;
  }
}
