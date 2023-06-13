import { Injectable } from '@nestjs/common';
import { CreateVersioningDto } from './dto/create-versioning.dto';
import { UpdateVersioningDto } from './dto/update-versioning.dto';

@Injectable()
export class VersioningService {
  create(createVersioningDto: CreateVersioningDto) {
    return 'This action adds a new versioning';
  }

  findAll() {
    return `This action returns all versioning`;
  }

  findOne(id: number) {
    return `This action returns a #${id} versioning`;
  }

  update(id: number, updateVersioningDto: UpdateVersioningDto) {
    return `This action updates a #${id} versioning`;
  }

  remove(id: number) {
    return `This action removes a #${id} versioning`;
  }
}
