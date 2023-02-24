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
    private readonly _primaryImpactAreaRepository: PrimaryImpactAreaRepository
  ) { }
  async create(createPrimaryImpactAreaDto: any[], user: TokenDto) {
    try {
      let listImpactAreaPrimary = []
      createPrimaryImpactAreaDto.forEach(async (resp) => {
        if (resp.impact_area_id != null && resp.result_code != null) {
          const primaryExists = resp.result_code;
          const impactArea = resp.impact_area_id;

          if (primaryExists) {
            const updatedImpact = await this._primaryImpactAreaRepository.update(primaryExists, { impact_area_id: impactArea });

            return {
              response: updatedImpact,
              message: 'Successful Update',
              status: HttpStatus.OK
            }
          }

          listImpactAreaPrimary.push({
            result_code: resp.result_code,
            impact_area_id: resp.impact_area_id,
            created_by: user.id,
            updated_by: user.id
          })
        }
      })

      const saveImpactAre = await this._primaryImpactAreaRepository.save(listImpactAreaPrimary);

      return {
        response: saveImpactAre,
        message: 'Successful Response',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }


}
