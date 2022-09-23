import { Injectable } from '@nestjs/common';
import { CreateGenderTagLevelDto } from './dto/create-gender_tag_level.dto';
import { UpdateGenderTagLevelDto } from './dto/update-gender_tag_level.dto';

@Injectable()
export class GenderTagLevelsService {
  create(createGenderTagLevelDto: CreateGenderTagLevelDto) {
    return 'This action adds a new genderTagLevel';
  }

  findAll() {
    return `This action returns all genderTagLevels`;
  }

  findOne(id: number) {
    return `This action returns a #${id} genderTagLevel`;
  }

  update(id: number, updateGenderTagLevelDto: UpdateGenderTagLevelDto) {
    return `This action updates a #${id} genderTagLevel`;
  }

  remove(id: number) {
    return `This action removes a #${id} genderTagLevel`;
  }
}
