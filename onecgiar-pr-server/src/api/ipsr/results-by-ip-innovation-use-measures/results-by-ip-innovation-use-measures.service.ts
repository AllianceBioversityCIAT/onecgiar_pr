import { Injectable } from '@nestjs/common';
import { CreateResultsByIpInnovationUseMeasureDto } from './dto/create-results-by-ip-innovation-use-measure.dto';
import { UpdateResultsByIpInnovationUseMeasureDto } from './dto/update-results-by-ip-innovation-use-measure.dto';

@Injectable()
export class ResultsByIpInnovationUseMeasuresService {
  create(createResultsByIpInnovationUseMeasureDto: CreateResultsByIpInnovationUseMeasureDto) {
    return 'This action adds a new resultsByIpInnovationUseMeasure';
  }

  findAll() {
    return `This action returns all resultsByIpInnovationUseMeasures`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsByIpInnovationUseMeasure`;
  }

  update(id: number, updateResultsByIpInnovationUseMeasureDto: UpdateResultsByIpInnovationUseMeasureDto) {
    return `This action updates a #${id} resultsByIpInnovationUseMeasure`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsByIpInnovationUseMeasure`;
  }
}
