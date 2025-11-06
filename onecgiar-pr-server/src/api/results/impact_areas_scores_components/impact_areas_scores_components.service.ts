import { HttpStatus, Injectable } from '@nestjs/common';
import {
  HandlersError,
  returnErrorDto,
} from '../../../shared/handlers/error.utils';
import { InjectRepository } from '@nestjs/typeorm';
import { ImpactAreasScoresComponent } from './entities/impact_areas_scores_component.entity';
import { Repository } from 'typeorm';
import { returnFormatImpactAreasScoresComponent } from './dto/return-impact_areas_scores_component.dto';
import { MessageResponse } from '../../../shared/constants/Responses.constant';

@Injectable()
export class ImpactAreasScoresComponentsService {
  constructor(
    @InjectRepository(ImpactAreasScoresComponent)
    private readonly _impactAreasScoresComponentRepository: Repository<ImpactAreasScoresComponent>,
    private readonly _handlersError: HandlersError,
  ) {}

  async findAll(): Promise<
    returnFormatImpactAreasScoresComponent | returnErrorDto
  > {
    try {
      const impactAreasScoresComponent: ImpactAreasScoresComponent[] =
        await this._impactAreasScoresComponentRepository.find();
      if (!impactAreasScoresComponent.length) {
        throw {
          response: {},
          message: 'Gender Tag not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: impactAreasScoresComponent,
        message: MessageResponse.OK,
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
