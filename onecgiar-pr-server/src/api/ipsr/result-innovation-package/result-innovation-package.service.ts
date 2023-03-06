import { Injectable } from '@nestjs/common';
import { CreateResultInnovationPackageDto } from './dto/create-result-innovation-package.dto';
import { UpdateResultInnovationPackageDto } from './dto/update-result-innovation-package.dto';

@Injectable()
export class ResultInnovationPackageService {
  create(createResultInnovationPackageDto: CreateResultInnovationPackageDto) {
    return 'This action adds a new resultInnovationPackage';
  }

  findAll() {
    return `This action returns all resultInnovationPackage`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultInnovationPackage`;
  }

  update(id: number, updateResultInnovationPackageDto: UpdateResultInnovationPackageDto) {
    return `This action updates a #${id} resultInnovationPackage`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultInnovationPackage`;
  }
}
