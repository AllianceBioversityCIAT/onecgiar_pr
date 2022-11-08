import { Injectable } from '@nestjs/common';
import { CreateClarisaInnovationCharacteristicDto } from './dto/create-clarisa-innovation-characteristic.dto';
import { UpdateClarisaInnovationCharacteristicDto } from './dto/update-clarisa-innovation-characteristic.dto';

@Injectable()
export class ClarisaInnovationCharacteristicsService {
  create(createClarisaInnovationCharacteristicDto: CreateClarisaInnovationCharacteristicDto) {
    return 'This action adds a new clarisaInnovationCharacteristic';
  }

  findAll() {
    return `This action returns all clarisaInnovationCharacteristics`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInnovationCharacteristic`;
  }

  update(id: number, updateClarisaInnovationCharacteristicDto: UpdateClarisaInnovationCharacteristicDto) {
    return `This action updates a #${id} clarisaInnovationCharacteristic`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInnovationCharacteristic`;
  }
}
