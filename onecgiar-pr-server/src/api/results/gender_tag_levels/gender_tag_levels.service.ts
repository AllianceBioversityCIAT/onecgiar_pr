import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateGenderTagLevelDto } from './dto/create-gender_tag_level.dto';
import { UpdateGenderTagLevelDto } from './dto/update-gender_tag_level.dto';
import { GenderTagRepository } from './genderTag.repository';
import { GenderTagLevel } from './entities/gender_tag_level.entity';
import {
  HandlersError,
  returnErrorDto,
} from '../../../shared/handlers/error.utils';
import { MessageResponse } from '../../../shared/constants/Responses.constant';
import { retunrFormatGenderTag } from './dto/return-format-gender-tag.dto';

@Injectable()
export class GenderTagLevelsService {
  constructor(
    private readonly _genderTagRepository: GenderTagRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  create(createGenderTagLevelDto: CreateGenderTagLevelDto) {
    return 'This action adds a new genderTagLevel';
  }

  async findAll(): Promise<retunrFormatGenderTag | returnErrorDto> {
    try {
      const genderTag: GenderTagLevel[] =
        await this._genderTagRepository.find();
      if (!genderTag.length) {
        throw {
          response: {},
          message: 'Gender Tag not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: genderTag,
        message: MessageResponse.OK,
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
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
