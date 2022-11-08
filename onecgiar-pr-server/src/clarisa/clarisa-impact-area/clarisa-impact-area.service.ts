import { Injectable } from '@nestjs/common';
import { CreateClarisaImpactAreaDto } from './dto/create-clarisa-impact-area.dto';
import { UpdateClarisaImpactAreaDto } from './dto/update-clarisa-impact-area.dto';

@Injectable()
export class ClarisaImpactAreaService {
  create(createClarisaImpactAreaDto: CreateClarisaImpactAreaDto) {
    return createClarisaImpactAreaDto;
  }

  findAll() {
    return `This action returns all clarisaImpactArea`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaImpactArea`;
  }

  update(id: number, updateClarisaImpactAreaDto: UpdateClarisaImpactAreaDto) {
    return `This action updates a #${id} clarisaImpactArea ${updateClarisaImpactAreaDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaImpactArea`;
  }
}
