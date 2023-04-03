import { Injectable } from '@nestjs/common';
import { CreateResultIpMeasureDto } from './dto/create-result-ip-measure.dto';
import { UpdateResultIpMeasureDto } from './dto/update-result-ip-measure.dto';

@Injectable()
export class ResultIpMeasuresService {
  create(createResultIpMeasureDto: CreateResultIpMeasureDto) {
    return 'This action adds a new resultIpMeasure';
  }

  findAll() {
    return `This action returns all resultIpMeasures`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultIpMeasure`;
  }

  update(id: number, updateResultIpMeasureDto: UpdateResultIpMeasureDto) {
    return `This action updates a #${id} resultIpMeasure`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultIpMeasure`;
  }
}
