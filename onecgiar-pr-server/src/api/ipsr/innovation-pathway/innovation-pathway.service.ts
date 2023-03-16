import { HttpStatus, Injectable } from '@nestjs/common';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultRepository } from '../../../api/results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { CreateInnovationPathwayDto } from './dto/create-innovation-pathway.dto';
import { UpdateInnovationPathwayDto } from './dto/update-innovation-pathway.dto';
import { ResultRegion } from '../../../api/results/result-regions/entities/result-region.entity';
import { ResultCountry } from '../../../api/results/result-countries/entities/result-country.entity';
import { ResultRegionRepository } from '../../../api/results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../../api/results/result-countries/result-countries.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { InnovationPackagingExpert } from '../innovation-packaging-experts/entities/innovation-packaging-expert.entity';
import { Result } from '../../results/entities/result.entity';
import { Version } from '../../results/versions/entities/version.entity';
import { CreateInnovationPackagingExpertDto } from '../innovation-packaging-experts/dto/create-innovation-packaging-expert.dto';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { CreateResultInnovationPackageDto } from '../result-innovation-package/dto/create-result-innovation-package.dto';
import { VersionsService } from '../../results/versions/versions.service';

@Injectable()
export class InnovationPathwayService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    protected readonly _innovationPackagingExpertRepository: InnovationPackagingExpertRepository,
    protected readonly _expertisesRepository: ExpertisesRepository,
    protected readonly _versionsService: VersionsService,
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository
  ) { }

  async updateMain(resultId: number, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    try {
      // * Check if result already exists
      const result =
        await this._resultRepository.findOneBy(
          { id: resultId }
        );
      // * Validate if the query incoming empty
      if (!result) {
        throw {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const vTemp = await this._versionsService.findBaseVersion();
      if (vTemp.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: vTemp });
      }
      const version: Version = <Version>vTemp.response;

      // * Assign the result id of the query
      return {
        response: [
          await this.geoScope(result.id, version, UpdateInnovationPathwayDto, user),
          await this.specifyAspiredOutcomesAndImpact(result.id, UpdateInnovationPathwayDto)
        ]
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }

  }

  async geoScope(id: number, version: Version, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    try {
      const req = UpdateInnovationPathwayDto;
      // * Obtain the regions in the body
      const regions = UpdateInnovationPathwayDto.regions;
      // * Obtain the countries in the body
      const countries = UpdateInnovationPathwayDto.countries;

      // * Validate if geo scope is empty
      if (!UpdateInnovationPathwayDto.geo_scope_id) {
        throw {
          response: UpdateInnovationPathwayDto.geo_scope_id,
          message: 'The geo_scope_id was not found',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      // * Update geo scope in the result
      const updateGeoScope = await this._resultRepository.update(id, {
        geographic_scope_id: req.geo_scope_id,
        last_updated_by: user.id
      });

      let resultRegions: ResultRegion[] = [];
      let resultCountries: ResultCountry[] = [];
      let updateRegions: any;
      let updateCountries: any;

      // * Validate consistency
      if (UpdateInnovationPathwayDto.geo_scope_id === 1 && (regions?.length || countries?.length)) {
        throw {
          response: UpdateInnovationPathwayDto.geo_scope_id,
          message: 'Mark as Global but incoming regions or countrie data',
          status: HttpStatus.BAD_REQUEST,
        }
      } else if (UpdateInnovationPathwayDto.geo_scope_id === 2 && countries?.length) {
        throw {
          response: UpdateInnovationPathwayDto.geo_scope_id,
          message: 'Mark as Regional but incoming countrie data',
          status: HttpStatus.BAD_REQUEST,
        }
      } else if ((UpdateInnovationPathwayDto.geo_scope_id === 3 || UpdateInnovationPathwayDto.geo_scope_id === 4) && regions?.length){
          throw {
            response: UpdateInnovationPathwayDto.geo_scope_id,
            message: 'Mark as National or Multi-National but incoming countrie data',
            status: HttpStatus.BAD_REQUEST,
          }
        
      }

      // * Validate if geo scope  is regional
      if (UpdateInnovationPathwayDto.geo_scope_id !== 2) {
        await this._resultRegionRepository.updateRegions(id, [])
      } else if (UpdateInnovationPathwayDto.geo_scope_id === 2) {
        if (regions) {
          await this._resultRegionRepository.updateRegions(id, UpdateInnovationPathwayDto.regions.map(r => r.id));
          if (regions?.length) {
            // * Iterate into the regions to save them
            for (let i = 0; i < regions.length; i++) {
              const regionsExist = await this._resultRegionRepository.getResultRegionByResultIdAndRegionId(id, regions[i].id);
              if (!regionsExist) {
                const newRegions = new ResultRegion();
                newRegions.region_id = regions[i].id;
                newRegions.result_id = id;
                newRegions.version_id = version.id;
                resultRegions.push(newRegions);
              }

              updateRegions = await this._resultRegionRepository.save(resultRegions);
            }
          }
        }
      }

      // * Validate if geo scope  is national or  multination
      if (UpdateInnovationPathwayDto.geo_scope_id !== 3) {
        await this._resultCountryRepository.updateCountries(id, []);
      } else if (UpdateInnovationPathwayDto.geo_scope_id === 3) {
        await this._resultCountryRepository.updateCountries(id, UpdateInnovationPathwayDto.countries.map(c => c.id));
        if (countries?.length) {
          // * Iterate into the countries to save them
          for (let i = 0; i < countries.length; i++) {
            const countriExist = await this._resultCountryRepository.getResultCountrieByIdResultAndCountryId(id, countries[i].id);
            if (!countriExist) {
              const newCountries = new ResultCountry();
              newCountries.country_id = countries[i].id;
              newCountries.result_id = id;
              newCountries.version_id = version.id
              resultCountries.push(newCountries);
            }

            updateCountries = await this._resultCountryRepository.save(resultCountries);
          }
        }
      }

      return {
        message: 'The Geographic Scope was updated correctly'
      }
    } catch (error) {
      console.log("🚀 ~ file: innovation-pathway.service.ts:134 ~ InnovationPathwayService ~ geoScope ~ error:", error)
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async specifyAspiredOutcomesAndImpact(result: number, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto) {
    return `This action removes a #${result} specifyAspiredOutcomesAndImpact`;
  }

  private async saveInnovationPackagingExperts(result: Result, v: Version, user: TokenDto, {result_innocation_package: rpData, experts}: CreateResultInnovationPackageDto) {
    const rip = await this._resultInnovationPackageRepository.findOne({
      where:{
        result_innovation_package_id: result.id
      }
    });

    if(rip){
      this._resultInnovationPackageRepository.update(
        result.id,
        {
          last_updated_by: user.id,
          experts_is_diverse: rpData?.experts_is_diverse,
          is_not_diverse_justification: !rpData?.experts_is_diverse?rpData.is_not_diverse_justification: null
        }
      );
    }else{
      this._resultInnovationPackageRepository.save({
        result_innovation_package_id: result.id,
        last_updated_by: user.id,
        created_by: user.id,
        experts_is_diverse: rpData?.experts_is_diverse,
        is_not_diverse_justification: !rpData?.experts_is_diverse?rpData.is_not_diverse_justification: null
      })
    }

    if (experts?.length) {
      for (const ex of experts) {
        let innExp: InnovationPackagingExpert = null;
        if (ex?.innovation_packaging_expert_id) {
          innExp = await this._innovationPackagingExpertRepository.findOne({
            where: {
              innovation_packaging_expert_id: ex.innovation_packaging_expert_id,
              result_id: result.id
            }
          });
        } else {
          innExp = await this._innovationPackagingExpertRepository.findOne({
            where: {
              email: ex.email,
              result_id: result.id
            }
          });
        }

        if (innExp) {
          await this._innovationPackagingExpertRepository.update(
            innExp.innovation_packaging_expert_id,
            ex.is_active?{
              first_name: ex.first_name,
              last_name: ex.last_name,
              version_id: v.id,
              is_active: ex.is_active,
              email: ex.email,
              last_updated_by: user.id,
              expertises_id: ex.expertises_id
            }:
            {
              is_active: ex.is_active
            }
          )
        } else {
          await this._innovationPackagingExpertRepository.save(
            {
              first_name: ex.first_name,
              last_name: ex.last_name,
              version_id: v.id,
              is_active: ex.is_active,
              email: ex.email,
              last_updated_by: user.id,
              created_by: user.id,
              expertises_id: ex.expertises_id
            }
          )
        }
      }
    }
  }
}
