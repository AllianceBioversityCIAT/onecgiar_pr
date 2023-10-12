import { Injectable } from '@nestjs/common';
import { CreateNonPooledPackageProjectDto } from './dto/create-non-pooled-package-project.dto';
import { UpdateNonPooledPackageProjectDto } from './dto/update-non-pooled-package-project.dto';

@Injectable()
export class NonPooledPackageProjectsService {
  create(createNonPooledPackageProjectDto: CreateNonPooledPackageProjectDto) {
    return 'This action adds a new nonPooledPackageProject';
  }

  findAll() {
    return `This action returns all nonPooledPackageProjects`;
  }

  findOne(id: number) {
    return `This action returns a #${id} nonPooledPackageProject`;
  }

  update(
    id: number,
    updateNonPooledPackageProjectDto: UpdateNonPooledPackageProjectDto,
  ) {
    return `This action updates a #${id} nonPooledPackageProject`;
  }

  remove(id: number) {
    return `This action removes a #${id} nonPooledPackageProject`;
  }
}
