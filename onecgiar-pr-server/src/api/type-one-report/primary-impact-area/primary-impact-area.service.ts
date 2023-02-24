import { Injectable, HttpStatus } from '@nestjs/common';
import { CreatePrimaryImpactAreaDto } from './dto/create-primary-impact-area.dto';
import { UpdatePrimaryImpactAreaDto } from './dto/update-primary-impact-area.dto';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { PrimaryImpactAreaRepository } from './primary-impact-area.repository';
import { TokenDto } from 'src/shared/globalInterfaces/token.dto';

@Injectable()
export class PrimaryImpactAreaService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _primaryImpactAreaRepository: PrimaryImpactAreaRepository,
  ) {}
  async create(createPrimaryImpactAreaDto: any[], user: TokenDto) {
    try {
      const listImpactAreaPrimary = [];

      for (const key in createPrimaryImpactAreaDto) {
        const resp = createPrimaryImpactAreaDto[key];

        if (resp.impact_area_id && resp.result_code) {
          const primaryExists = await this._primaryImpactAreaRepository.findBy({
            result_code: resp.result_code,
          });
          const resultCode = primaryExists.map((e) => e.result_code);
          const impactArea = resp.impact_area_id;

          if (primaryExists.length) {
            await this._primaryImpactAreaRepository.update(resultCode, {
              impact_area_id: impactArea,
            });
          } else {
            console.log('push');
            listImpactAreaPrimary.push({
              result_code: resp.result_code,
              impact_area_id: resp.impact_area_id,
              created_by: user.id,
              updated_by: user.id,
            });
          }
        }
      }

      const saveImpactAre = await this._primaryImpactAreaRepository.save(
        listImpactAreaPrimary,
      );

      return {
        response: saveImpactAre,
        message: 'Successful Response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
