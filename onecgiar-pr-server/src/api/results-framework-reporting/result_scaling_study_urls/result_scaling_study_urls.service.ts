import { Injectable } from '@nestjs/common';

@Injectable()
export class ResultScalingStudyUrlsService {
  create() {
    return 'This action adds a new resultScalingStudyUrl';
  }

  findAll() {
    return `This action returns all resultScalingStudyUrls`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultScalingStudyUrl`;
  }

  update(id: number) {
    return `This action updates a #${id} resultScalingStudyUrl`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultScalingStudyUrl`;
  }
}
