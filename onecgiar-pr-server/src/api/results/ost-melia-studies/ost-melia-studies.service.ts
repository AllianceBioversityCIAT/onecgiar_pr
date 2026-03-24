import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { OstMeliaStudiesRepository } from './ost-melia-studies.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';

@Injectable()
export class OstMeliaStudiesService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _ostMeliaStudiesRepository: OstMeliaStudiesRepository,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
  ) {}

  async getMeliaStudiesFromResultId(initiativeId: number) {
    try {
      const meliaStudies =
        await this._ostMeliaStudiesRepository.getMeliaStudiesFromResultId(
          initiativeId,
        );
      if (!meliaStudies.length) {
        throw {
          response: {},
          message: 'Melia Studies Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: meliaStudies,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getMeliaStudiesFromToC(initiativeId: number) {
    try {
      const initiative = await this._clarisaInitiativesRepository.findOne({
        where: { id: initiativeId },
        select: ['id', 'official_code'],
      });
      if (!initiative?.official_code) {
        throw new NotFoundException('Initiative not found');
      }
      const meliaStudies =
        await this._ostMeliaStudiesRepository.getMeliaStudiesByOfficialCode(
          initiative.official_code,
        );
      if (!meliaStudies?.length) {
        throw new NotFoundException('Melia Studies Not Found');
      }
      return {
        response: meliaStudies,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
