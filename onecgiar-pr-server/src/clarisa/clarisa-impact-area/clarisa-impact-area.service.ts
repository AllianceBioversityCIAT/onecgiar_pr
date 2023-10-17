import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateClarisaImpactAreaDto } from './dto/create-clarisa-impact-area.dto';
import { UpdateClarisaImpactAreaDto } from './dto/update-clarisa-impact-area.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaImpactAreaRepository } from './ClarisaImpactArea.repository';

@Injectable()
export class ClarisaImpactAreaService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaImpactAreaRepository: ClarisaImpactAreaRepository,
  ) {}

  async findAll() {
    try {
      const carisaImpactArea =
        await this._clarisaImpactAreaRepository.getAllImpactArea();

      return {
        response: carisaImpactArea,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
