import { Injectable } from '@nestjs/common';
import { CreatePrimaryImpactAreaDto } from './dto/create-primary-impact-area.dto';
import { UpdatePrimaryImpactAreaDto } from './dto/update-primary-impact-area.dto';

@Injectable()
export class PrimaryImpactAreaService {
  create(createPrimaryImpactAreaDto: CreatePrimaryImpactAreaDto) {
    return 'This action adds a new primaryImpactArea';
  }

  findAll() {
    return `This action returns all primaryImpactArea`;
  }

  findOne(id: number) {
    return `This action returns a #${id} primaryImpactArea`;
  }

  update(id: number, updatePrimaryImpactAreaDto: UpdatePrimaryImpactAreaDto) {
    return `This action updates a #${id} primaryImpactArea`;
  }

  remove(id: number) {
    return `This action removes a #${id} primaryImpactArea`;
  }
}
