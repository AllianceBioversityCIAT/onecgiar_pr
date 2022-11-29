import { Injectable } from '@nestjs/common';
import { CreateUnitsOfMeasureDto } from './dto/create-units-of-measure.dto';
import { UpdateUnitsOfMeasureDto } from './dto/update-units-of-measure.dto';

@Injectable()
export class UnitsOfMeasureService {
  create(createUnitsOfMeasureDto: CreateUnitsOfMeasureDto) {
    return 'This action adds a new unitsOfMeasure';
  }

  findAll() {
    return `This action returns all unitsOfMeasure`;
  }

  findOne(id: number) {
    return `This action returns a #${id} unitsOfMeasure`;
  }

  update(id: number, updateUnitsOfMeasureDto: UpdateUnitsOfMeasureDto) {
    return `This action updates a #${id} unitsOfMeasure`;
  }

  remove(id: number) {
    return `This action removes a #${id} unitsOfMeasure`;
  }
}
