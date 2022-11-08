import { Injectable } from '@nestjs/common';
import { CreateNonPooledProjectDto } from './dto/create-non-pooled-project.dto';
import { UpdateNonPooledProjectDto } from './dto/update-non-pooled-project.dto';

@Injectable()
export class NonPooledProjectsService {
  create(createNonPooledProjectDto: CreateNonPooledProjectDto) {
    return 'This action adds a new nonPooledProject';
  }

  findAll() {
    return `This action returns all nonPooledProjects`;
  }

  findOne(id: number) {
    return `This action returns a #${id} nonPooledProject`;
  }

  update(id: number, updateNonPooledProjectDto: UpdateNonPooledProjectDto) {
    return `This action updates a #${id} nonPooledProject`;
  }

  remove(id: number) {
    return `This action removes a #${id} nonPooledProject`;
  }
}
