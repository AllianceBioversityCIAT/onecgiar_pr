import { Injectable } from '@nestjs/common';
import { CreateResultInnovationPackageRegionDto } from './dto/create-result-innovation-package-region.dto';
import { UpdateResultInnovationPackageRegionDto } from './dto/update-result-innovation-package-region.dto';

@Injectable()
export class ResultInnovationPackageRegionsService {
  create(
    createResultInnovationPackageRegionDto: CreateResultInnovationPackageRegionDto,
  ) {
    return 'This action adds a new resultInnovationPackageRegion';
  }

  findAll() {
    return `This action returns all resultInnovationPackageRegions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultInnovationPackageRegion`;
  }

  update(
    id: number,
    updateResultInnovationPackageRegionDto: UpdateResultInnovationPackageRegionDto,
  ) {
    return `This action updates a #${id} resultInnovationPackageRegion`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultInnovationPackageRegion`;
  }
}
