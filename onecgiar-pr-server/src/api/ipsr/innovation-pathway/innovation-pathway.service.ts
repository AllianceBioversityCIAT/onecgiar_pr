import { HttpStatus, Injectable, Type } from '@nestjs/common';
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
import { ResultInnovationPackage } from '../result-innovation-package/entities/result-innovation-package.entity';
import { IpsrRepository } from '../ipsr.repository';
import { CreateResultIPDto } from '../result-innovation-package/dto/create-result-ip.dto';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { ResultIpSdgTargets } from './entities/result-ip-sdg-targets.entity';
import { ResultIpEoiOutcomeRepository } from './repository/result-ip-eoi-outcomes.repository';
import { ResultIpEoiOutcome } from './entities/result-ip-eoi-outcome.entity';
import { In } from 'typeorm';
import { ResultIpAAOutcomeRepository } from './repository/result-ip-action-area-outcome.repository';
import { ResultIpAAOutcome } from './entities/result-ip-action-area-outcome.entity';

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
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    protected readonly _innovationByResultRepository: IpsrRepository,
    protected readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    protected readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    protected readonly _resultIpEoiOutcomes: ResultIpEoiOutcomeRepository,
    protected readonly _resultIpAAOutcomes: ResultIpAAOutcomeRepository,
    protected readonly _resultIpSdgsTargetsRepository: ResultIpSdgTargetRepository
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

      const geoScope = await this.geoScope(result, version, UpdateInnovationPathwayDto, user);
      const specifyAspiredOutcomesAndImpact = await this.saveSpecifyAspiredOutcomesAndImpact(result, version, UpdateInnovationPathwayDto, user);
      const saveActionAreaOutcomes = await this.saveActionAreaOutcomes(result, version, UpdateInnovationPathwayDto, user);
      const sdgTargets = await this.saveSdgTargets(result, version, UpdateInnovationPathwayDto, user);

      return {
        response: [
          geoScope,
          specifyAspiredOutcomesAndImpact,
          saveActionAreaOutcomes,
          sdgTargets
        ]
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }

  }

  async geoScope(result: any, version: Version, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    const id = result.id;
    try {
      const req = UpdateInnovationPathwayDto;
      const regions = UpdateInnovationPathwayDto.regions;
      const countries = UpdateInnovationPathwayDto.countries;

      if (!UpdateInnovationPathwayDto.geo_scope_id) {
        throw {
          response: UpdateInnovationPathwayDto.geo_scope_id,
          message: 'The geo_scope_id was not found',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const updateGeoScope = await this._resultRepository.update(id, {
        geographic_scope_id: req.geo_scope_id,
        last_updated_by: user.id,
        last_updated_date: new Date()
      });

      let resultRegions: ResultRegion[] = [];
      let resultCountries: ResultCountry[] = [];
      let updateRegions: any;
      let updateCountries: any;

      if (UpdateInnovationPathwayDto.geo_scope_id !== 2) {
        await this._resultRegionRepository.updateRegions(id, [])
      } else if (UpdateInnovationPathwayDto.geo_scope_id === 2) {
        if (regions) {
          await this._resultRegionRepository.updateRegions(id, UpdateInnovationPathwayDto.regions.map(r => r.id));
          if (regions?.length) {
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

      if (UpdateInnovationPathwayDto.geo_scope_id !== 3) {
        await this._resultCountryRepository.updateCountries(id, []);
      } else if (UpdateInnovationPathwayDto.geo_scope_id === 3) {
        await this._resultCountryRepository.updateCountries(id, UpdateInnovationPathwayDto.countries.map(c => c.id));
        if (countries?.length) {
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

      const ipsrResult =
        await this._innovationByResultRepository.findOneBy({ result_innovation_package_id: id });

      const coreResult =
        await this._resultRepository.findOneBy({ id: ipsrResult.result_id });

      let innovationTitle: string;

      if (UpdateInnovationPathwayDto.geo_scope_id === 2) {
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${coreResult.title} in ${regions.map(r => r.name).join(', ')}`;
      } else if (UpdateInnovationPathwayDto.geo_scope_id === 3) {
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${coreResult.title} in ${countries.map(c => c.name).join(', ')}`;
      } else {
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${coreResult.title}`;
      }

      const titleValidate = await this._resultRepository
        .createQueryBuilder('result')
        .where('result.title like :title', { title: `${innovationTitle}` })
        .andWhere('result.is_active = 1')
        .getMany();

      if (!titleValidate.find(tv => tv.id === id)) {
        throw {
          response: titleValidate.map(tv => tv.id),
          message: `The title already exists, in the following results: ${titleValidate.map(tv => tv.result_code)}`,
          status: HttpStatus.BAD_REQUEST,
        }
      }

      const updateTitle = await this._resultRepository.update(id, {
        title: innovationTitle || result.title,
        last_updated_by: user.id,
        last_updated_date: new Date(),
      });

      return {
        response: updateTitle,
        message: 'The Geographic Scope and Title was updated correctly',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveSpecifyAspiredOutcomesAndImpact(result: any, version: Version, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    const id = result.id;
    try {
      const resultByInnovationPackageId = await this._innovationByResultRepository.findOneBy({ result_innovation_package_id: id })
      const result_by_innovation_package_id = resultByInnovationPackageId.result_by_innovation_package_id;
      const eoiOutcomes = UpdateInnovationPathwayDto.eoiOutcomes;

      const allTocByResult = await this._resultIpEoiOutcomes.find({
        where: { result_by_innovation_package_id: result_by_innovation_package_id },
      });

      const existingIds = allTocByResult.map(et => et.toc_result_id);

      const tocsToActive = allTocByResult.filter(
        eoi =>
          eoiOutcomes.find(e => e.toc_result_id === eoi.toc_result_id) &&
          eoi.is_active === false,
      );

      const tocsToInactive = allTocByResult.filter(
        eoi =>
          !eoiOutcomes.find(e => e.toc_result_id === eoi.toc_result_id) &&
          eoi.is_active === true,
      );

      const tocsToSave = eoiOutcomes.filter(
        eoi => !existingIds.includes(eoi.toc_result_id),
      );

      const saveToc = [];

      if (tocsToSave.length > 0) {
        for (const entity of tocsToSave) {
          const newEoi = new ResultIpEoiOutcome();
          newEoi.toc_result_id = entity.toc_result_id;
          newEoi.result_by_innovation_package_id = result_by_innovation_package_id;
          newEoi.version_id = version.id;
          newEoi.created_by = user.id;
          newEoi.last_updated_by = user.id;
          newEoi.created_date = new Date();
          newEoi.last_updated_date = new Date();
          saveToc.push(this._resultIpEoiOutcomes.save(newEoi));
        }
      }

      if (tocsToActive.length > 0) {
        for (const entity of tocsToActive) {
          entity.is_active = true;
          saveToc.push(this._resultIpEoiOutcomes.save(entity));
        }
      }

      if (tocsToInactive.length > 0) {
        for (const entity of tocsToInactive) {
          entity.is_active = false;
          saveToc.push(this._resultIpEoiOutcomes.save(entity));
        }
      }

      return {
        response: { status: 'Success' },
        message: 'The EOI Outcomes have been saved successfully',
        status: HttpStatus.OK
      }

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveActionAreaOutcomes(result: any, version: Version, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    const id = result.id;
    try {
      const resultByInnovationPackageId = await this._innovationByResultRepository.findOneBy({ result_innovation_package_id: id })
      const result_by_innovation_package_id = resultByInnovationPackageId.result_by_innovation_package_id;
      const aaOutcomes = UpdateInnovationPathwayDto.actionAreaOutcomes;

      const allAAOutcome = await this._resultIpAAOutcomes.find({
        where: { result_by_innovation_package_id: result_by_innovation_package_id },
      });

      const existingIds = allAAOutcome.map(et => et.action_area_outcome_id);

      const aaToActive = allAAOutcome.filter(
        eoi =>
          aaOutcomes.find(e => e.action_area_outcome_id === eoi.action_area_outcome_id) &&
          eoi.is_active === false,
      );

      const aaToInactive = allAAOutcome.filter(
        eoi =>
          !aaOutcomes.find(e => e.action_area_outcome_id === eoi.action_area_outcome_id) &&
          eoi.is_active === true,
      );

      const aaToSave = aaOutcomes.filter(
        eoi => !existingIds.includes(eoi.action_area_outcome_id),
      );

      const saveToc = [];

      if (aaToSave.length > 0) {
        for (const entity of aaToSave) {
          const newEoi = new ResultIpAAOutcome();
          newEoi.action_area_outcome_id = entity.action_area_outcome_id;
          newEoi.result_by_innovation_package_id = result_by_innovation_package_id;
          newEoi.version_id = version.id;
          newEoi.created_by = user.id;
          newEoi.last_updated_by = user.id;
          newEoi.created_date = new Date();
          newEoi.last_updated_date = new Date();
          saveToc.push(this._resultIpAAOutcomes.save(newEoi));
        }
      }

      if (aaToActive.length > 0) {
        for (const entity of aaToActive) {
          entity.is_active = true;
          saveToc.push(this._resultIpAAOutcomes.save(entity));
        }
      }

      if (aaToInactive.length > 0) {
        for (const entity of aaToInactive) {
          entity.is_active = false;
          saveToc.push(this._resultIpAAOutcomes.save(entity));
        }
      }

      return {
        response: { status: 'Success' },
        message: 'The Action Area Outcomes have been saved successfully',
        status: HttpStatus.OK
      }

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveSdgTargets(result: any, version: Version, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    const id = result.id;
    try {
      let saveSdgs: any;
      let sdgsTargets: ResultIpSdgTargets[] = [];
      const resultByInnovationPackageId = await this._innovationByResultRepository.findOneBy({ result_innovation_package_id: id })
      const sdgs = UpdateInnovationPathwayDto.sdgTargets;

      await this._resultIpSdgsTargetsRepository.updateSdg(resultByInnovationPackageId.result_by_innovation_package_id, sdgs.map(c => c.clarisa_sdg_target_id), user.id);
      if (sdgs?.length) {
        for (let i = 0; i < sdgs.length; i++) {
          const sdgExist = await this._resultIpSdgsTargetsRepository.getSdgsByIpAndSdgId(resultByInnovationPackageId.result_by_innovation_package_id, sdgs[i].clarisa_sdg_target_id);

          if (!sdgExist) {
            const newSdgs = new ResultIpSdgTargets();
            newSdgs.clarisa_sdg_target_id = sdgs[i].clarisa_sdg_target_id;
            newSdgs.clarisa_sdg_usnd_code = sdgs[i].clarisa_sdg_usnd_code;
            newSdgs.result_by_innovation_package_id = resultByInnovationPackageId.result_by_innovation_package_id;
            newSdgs.created_by = user.id;
            newSdgs.version_id = version.id;
            newSdgs.last_updated_by = user.id;
            newSdgs.created_date = new Date();
            newSdgs.last_updated_date = new Date();
            sdgsTargets.push(newSdgs);
          }

          saveSdgs = await this._resultIpSdgsTargetsRepository.save(sdgsTargets);
        }
      }

      return {
        response: { status: 'Success' },
        message: 'The SDGs have been saved successfully',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async saveInnovationPackagingExperts(result: Result, v: Version, user: TokenDto, { result_ip: rpData, experts }: UpdateInnovationPathwayDto) {
    const rip = await this._resultInnovationPackageRepository.findOne({
      where: {
        result_innovation_package_id: result.id
      }
    });

    if (rip) {
      this._resultInnovationPackageRepository.update(
        result.id,
        {
          last_updated_by: user.id,
          experts_is_diverse: rpData?.experts_is_diverse,
          is_not_diverse_justification: !rpData?.experts_is_diverse ? rpData.is_not_diverse_justification : null
        }
      );
    } else {
      this._resultInnovationPackageRepository.save({
        result_innovation_package_id: result.id,
        last_updated_by: user.id,
        created_by: user.id,
        experts_is_diverse: rpData?.experts_is_diverse,
        is_not_diverse_justification: !rpData?.experts_is_diverse ? rpData.is_not_diverse_justification : null
      })
    }

    if (experts?.length) {
      for (const ex of experts) {
        let innExp: InnovationPackagingExpert = null;
        if (ex?.result_ip_expert_id) {
          innExp = await this._innovationPackagingExpertRepository.findOne({
            where: {
              result_ip_expert_id: ex.result_ip_expert_id,
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
            innExp.result_ip_expert_id,
            ex.is_active ? {
              first_name: ex.first_name,
              last_name: ex.last_name,
              version_id: v.id,
              is_active: ex.is_active,
              email: ex.email,
              last_updated_by: user.id,
              expertises_id: ex.expertises_id
            } :
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

  private async saveConsensus(result: Result, user: TokenDto, version: Version, rip: CreateResultIPDto) {
    try {
      const ripExists = await this._resultInnovationPackageRepository.findOne({
        where: {
          result_innovation_package_id: result.id
        }
      });
      if (ripExists) {
        await this._resultInnovationPackageRepository.update(
          result.id,
          {
            active_backstopping: rip.active_backstopping,
            consensus_initiative_work_package: rip.consensus_initiative_work_package,
            regional_integrated: rip.regional_integrated,
            relevant_country: rip.relevant_country,
            regional_leadership: rip.regional_leadership,
            is_active: true,
            last_updated_by: user.id
          }
        );
      } else {
        await this._resultInnovationPackageRepository.save(
          {
            result_innovation_package_id: result.id,
            active_backstopping: rip.active_backstopping,
            consensus_initiative_work_package: rip.consensus_initiative_work_package,
            regional_integrated: rip.regional_integrated,
            relevant_country: rip.relevant_country,
            regional_leadership: rip.regional_leadership,
            version_id: version.id,
            created_by: user.id,
            last_updated_by: user.id
          }
        );
      }
      const res = await this._resultInnovationPackageRepository.findOne({
        where: {
          result_innovation_package_id: result.id
        }
      });
      return res;
    } catch (error) {
      return null
    }
  }

  private async savePartners(result: Result, user: TokenDto, version: Version, crtr: UpdateInnovationPathwayDto) {
    if (crtr?.institutions.length) {
      const { institutions: inst } = crtr;
      await this._resultByIntitutionsRepository.updateIstitutions(result.id, inst, false, user.id);
      for (const ins of inst) {
        const instExist = await this._resultByIntitutionsRepository.getGenericResultByInstitutionExists(result.id, ins.institutions_id, 5);
        let rbi: ResultsByInstitution = null;
        if (!instExist) {
          rbi = await this._resultByIntitutionsRepository.save({
            institution_roles_id: 2,
            institutions_id: ins.institutions_id,
            result_id: result.id,
            version_id: version.id,
            created_by: user.id,
            last_updated_by: user.id
          })
        }

        if (ins?.deliveries.length) {
          const { deliveries } = ins;
          await this.saveDeliveries(instExist ? instExist : rbi, deliveries, user.id, version);
        }
      }
    } else {
      await this._resultByIntitutionsRepository.updateIstitutions(result.id, [], false, user.id);
    }
  }

  protected async saveDeliveries(inst: ResultsByInstitution, deliveries: number[], userId: number, v: Version) {
    await this._resultByInstitutionsByDeliveriesTypeRepository.inactiveResultDeLivery(inst.id, deliveries, userId);
    for (const deli of deliveries) {
      const deliExist = await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByTypeAndResultByInstitution(inst.id, deli);
      if (!deliExist) {
        await this._resultByInstitutionsByDeliveriesTypeRepository.save({
          partner_delivery_type_id: deli,
          result_by_institution_id: inst.id,
          last_updated_by: userId,
          created_by: userId,
          versions_id: v.id
        });
      }
    }
  }
}
