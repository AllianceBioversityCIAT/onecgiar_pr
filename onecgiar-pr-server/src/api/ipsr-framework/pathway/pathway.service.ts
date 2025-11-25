import { Injectable } from '@nestjs/common';
import { CreatePathwayDto } from './dto/create-pathway.dto';
import { UpdatePathwayDto } from './dto/update-pathway.dto';

@Injectable()
export class PathwayService {
  create(createPathwayDto: CreatePathwayDto) {
    return 'This action adds a new pathway';
  }

  findAll() {
    return `This action returns all pathway`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pathway`;
  }

  update(id: number, updatePathwayDto: UpdatePathwayDto) {
    return `This action updates a #${id} pathway`;
  }

  remove(id: number) {
    return `This action removes a #${id} pathway`;
  }
}
