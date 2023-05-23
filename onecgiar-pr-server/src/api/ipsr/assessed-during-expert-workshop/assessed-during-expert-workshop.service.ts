import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateAssessedDuringExpertWorkshopDto } from './dto/create-assessed-during-expert-workshop.dto';
import { UpdateAssessedDuringExpertWorkshopDto } from './dto/update-assessed-during-expert-workshop.dto';
import { AssessedDuringExpertWorkshopRepository } from './assessed-during-expert-workshop.repository';
import {
  HandlersError,
  ReturnResponse,
  ReturnResponseDto,
} from '../../../shared/handlers/error.utils';

@Injectable()
export class AssessedDuringExpertWorkshopService {
  constructor(
    private readonly _assessedDuringExpertWorkshopRepository: AssessedDuringExpertWorkshopRepository,
    private readonly _handlersError: HandlersError,
    private readonly _returnResponse: ReturnResponse,
  ) {}

  create(
    createAssessedDuringExpertWorkshopDto: CreateAssessedDuringExpertWorkshopDto,
  ) {
    return 'This action adds a new assessedDuringExpertWorkshop';
  }

  async findAll(): Promise<ReturnResponseDto<any>> {
    try {
      const response =
        await this._assessedDuringExpertWorkshopRepository.find();

      if (!response?.length) {
        throw this._returnResponse.format({
          message: 'Assessed during expert workshop not found',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      return this._returnResponse.format({
        message: 'Assessed during expert workshop found',
        statusCode: HttpStatus.OK,
        response,
      });
    } catch (error) {
      return this._returnResponse.format(error, true);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} assessedDuringExpertWorkshop`;
  }

  update(
    id: number,
    updateAssessedDuringExpertWorkshopDto: UpdateAssessedDuringExpertWorkshopDto,
  ) {
    return `This action updates a #${id} assessedDuringExpertWorkshop`;
  }

  remove(id: number) {
    return `This action removes a #${id} assessedDuringExpertWorkshop`;
  }
}
