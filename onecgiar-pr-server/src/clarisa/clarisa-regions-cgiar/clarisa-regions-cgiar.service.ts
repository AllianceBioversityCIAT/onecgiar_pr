import { Injectable } from '@nestjs/common';
import { CreateClarisaRegionsCgiarDto } from './dto/create-clarisa-regions-cgiar.dto';
import { UpdateClarisaRegionsCgiarDto } from './dto/update-clarisa-regions-cgiar.dto';

@Injectable()
export class ClarisaRegionsCgiarService {
  create(createClarisaRegionsCgiarDto: CreateClarisaRegionsCgiarDto) {
    return 'This action adds a new clarisaRegionsCgiar';
  }

  findAll() {
    return `This action returns all clarisaRegionsCgiar`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaRegionsCgiar`;
  }

  update(id: number, updateClarisaRegionsCgiarDto: UpdateClarisaRegionsCgiarDto) {
    return `This action updates a #${id} clarisaRegionsCgiar`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaRegionsCgiar`;
  }
}
