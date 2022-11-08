import { Injectable } from '@nestjs/common';
import { CreateTocLevelDto } from './dto/create-toc-level.dto';
import { UpdateTocLevelDto } from './dto/update-toc-level.dto';

@Injectable()
export class TocLevelService {
  create(createTocLevelDto: CreateTocLevelDto) {
    return 'This action adds a new tocLevel';
  }

  findAll() {
    return `This action returns all tocLevel`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tocLevel`;
  }

  update(id: number, updateTocLevelDto: UpdateTocLevelDto) {
    return `This action updates a #${id} tocLevel`;
  }

  remove(id: number) {
    return `This action removes a #${id} tocLevel`;
  }
}
