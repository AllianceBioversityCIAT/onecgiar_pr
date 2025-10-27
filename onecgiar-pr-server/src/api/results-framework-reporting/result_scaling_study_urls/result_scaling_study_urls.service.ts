import { Injectable } from '@nestjs/common';
import { CreateResultScalingStudyUrlDto } from './dto/create-result_scaling_study_url.dto';
import { UpdateResultScalingStudyUrlDto } from './dto/update-result_scaling_study_url.dto';

@Injectable()
export class ResultScalingStudyUrlsService {
  create(createResultScalingStudyUrlDto: CreateResultScalingStudyUrlDto) {
    return 'This action adds a new resultScalingStudyUrl';
  }

  findAll() {
    return `This action returns all resultScalingStudyUrls`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultScalingStudyUrl`;
  }

  update(id: number, updateResultScalingStudyUrlDto: UpdateResultScalingStudyUrlDto) {
    return `This action updates a #${id} resultScalingStudyUrl`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultScalingStudyUrl`;
  }
}
