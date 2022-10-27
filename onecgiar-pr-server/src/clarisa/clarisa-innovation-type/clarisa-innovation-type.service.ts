import { Injectable } from '@nestjs/common';
import { CreateClarisaInnovationTypeDto } from './dto/create-clarisa-innovation-type.dto';
import { UpdateClarisaInnovationTypeDto } from './dto/update-clarisa-innovation-type.dto';

@Injectable()
export class ClarisaInnovationTypeService {
  create(createClarisaInnovationTypeDto: CreateClarisaInnovationTypeDto) {
    return 'This action adds a new clarisaInnovationType';
  }

  findAll() {
    return `This action returns all clarisaInnovationType`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInnovationType`;
  }

  update(id: number, updateClarisaInnovationTypeDto: UpdateClarisaInnovationTypeDto) {
    return `This action updates a #${id} clarisaInnovationType`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInnovationType`;
  }
}
