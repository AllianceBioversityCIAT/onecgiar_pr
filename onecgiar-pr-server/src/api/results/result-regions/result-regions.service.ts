import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateResultRegionDto } from './dto/create-result-region.dto';
import { UpdateResultRegionDto } from './dto/update-result-region.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegionRepository } from './result-regions.repository';
import { ClarisaGeographicScopeRepository } from '../../../clarisa/clarisa-geographic-scopes/clarisa-geographic-scopes.repository';
import { ResultRepository } from '../result.repository';
import { Result } from '../entities/result.entity';
import { ResultRegion } from './entities/result-region.entity';

@Injectable()
export class ResultRegionsService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _clarisaGeographicScopeRepository: ClarisaGeographicScopeRepository
  ) { }

  async create(createResultRegionDto: CreateResultRegionDto) {
    try {
      if (!createResultRegionDto?.scope_id) {
        throw {
          response: {},
          message: 'Missing data in the request',
          status: HttpStatus.BAD_REQUEST,
        };
      }
      //!importante hay una tabla por cada uno pero fijo se mandara a un solo enpoint y que el haga el restos
      const result: Result = await this._resultRepository.getResultById(createResultRegionDto.result_id);
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const regions = createResultRegionDto.regions;
      if (regions?.length) {
        await this._resultRegionRepository.updateRegions(result.id, createResultRegionDto.regions);
        if (regions?.length) {
          let resultRegionArray: ResultRegion[] = [];
          for (let index = 0; index < regions.length; index++) {
            const exist = await this._resultRegionRepository.getResultRegionByResultIdAndRegionId(result.id, regions[index]);
            if (!exist) {
              const newRegions = new ResultRegion();
              newRegions.region_id = regions[index];
              newRegions.result_id = result.id;
              resultRegionArray.push(newRegions);
            }
            console.log(resultRegionArray)
            await this._resultRegionRepository.save(resultRegionArray);

          }
        }
      }
      result.geographic_scope_id = createResultRegionDto.scope_id;
      await this._resultRepository.save(result);

      return {
        response: regions,
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findAll() {
    return `This action returns all resultRegions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultRegion`;
  }

  update(id: number, updateResultRegionDto: UpdateResultRegionDto) {
    return `This action updates a #${id} resultRegion`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultRegion`;
  }
}
