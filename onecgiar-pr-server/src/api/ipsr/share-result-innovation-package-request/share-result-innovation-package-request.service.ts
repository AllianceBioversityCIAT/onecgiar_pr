import { Injectable } from '@nestjs/common';
import { CreateShareResultInnovationPackageRequestDto } from './dto/create-share-result-innovation-package-request.dto';
import { UpdateShareResultInnovationPackageRequestDto } from './dto/update-share-result-innovation-package-request.dto';

@Injectable()
export class ShareResultInnovationPackageRequestService {
  create(
    createShareResultInnovationPackageRequestDto: CreateShareResultInnovationPackageRequestDto,
  ) {
    return 'This action adds a new shareResultInnovationPackageRequest';
  }

  findAll() {
    return `This action returns all shareResultInnovationPackageRequest`;
  }

  findOne(id: number) {
    return `This action returns a #${id} shareResultInnovationPackageRequest`;
  }

  update(
    id: number,
    updateShareResultInnovationPackageRequestDto: UpdateShareResultInnovationPackageRequestDto,
  ) {
    return `This action updates a #${id} shareResultInnovationPackageRequest`;
  }

  remove(id: number) {
    return `This action removes a #${id} shareResultInnovationPackageRequest`;
  }
}
