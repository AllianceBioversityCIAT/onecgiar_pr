import { HttpStatus, Injectable, Type } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { getInnovationComInterface, IpsrRepository } from '../ipsr.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { ResultIpEoiOutcomeRepository } from './repository/result-ip-eoi-outcomes.repository';
import { ResultIpAAOutcomeRepository } from './repository/result-ip-action-area-outcome.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../result-ip-measures/result-ip-measures.repository';
import { ResultIpImpactAreaRepository } from './repository/result-ip-impact-area-targets.repository';
import { In } from 'typeorm';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Ipsr } from '../entities/ipsr.entity';
import { Version } from '../../results/versions/entities/version.entity';
import { ResultsComplementaryInnovationRepository } from '../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { ResultsComplementaryInnovationsFunctionRepository } from '../results-complementary-innovations-functions/repositories/results-complementary-innovations-function.repository';
import { ResultsComplementaryInnovationsFunction } from '../results-complementary-innovations-functions/entities/results-complementary-innovations-function.entity';
import { Evidence } from '../../../api/results/evidences/entities/evidence.entity';
import { EvidencesRepository } from '../../../api/results/evidences/evidences.repository';
import { CreateComplementaryInnovationDto } from './dto/create-complementary-innovation.dto'
import { Result } from '../../../api/results/entities/result.entity';
import { Year } from '../../../api/results/years/entities/year.entity';
import { YearRepository } from '../../../api/results/years/year.repository';
import { ResultByInitiativesRepository } from 'src/api/results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultInnovationPackage } from '../result-innovation-package/entities/result-innovation-package.entity';
import { ResultsByInititiative } from 'src/api/results/results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultsComplementaryInnovation } from '../results-complementary-innovations/entities/results-complementary-innovation.entity';
import { ComplementaryInnovationFunctionsRepository } from '../results-complementary-innovations-functions/repositories/complementary-innovation-functions.repository';

@Injectable()
export class InnovationPathwayStepTwoService {
  constructor(
    protected readonly _versionsService: VersionsService,
    protected readonly _handlersError: HandlersError,
    protected readonly _resultRepository: ResultRepository,
    protected readonly _resultRegionRepository: ResultRegionRepository,
    protected readonly _resultCountryRepository: ResultCountryRepository,
    protected readonly _innovationPackagingExpertRepository: InnovationPackagingExpertRepository,
    protected readonly _expertisesRepository: ExpertisesRepository,
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    protected readonly _innovationByResultRepository: IpsrRepository,
    protected readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    protected readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    protected readonly _resultIpEoiOutcomes: ResultIpEoiOutcomeRepository,
    protected readonly _resultIpAAOutcomes: ResultIpAAOutcomeRepository,
    protected readonly _resultIpSdgsTargetsRepository: ResultIpSdgTargetRepository,
    protected readonly _resultActorRepository: ResultActorRepository,
    protected readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    protected readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    protected readonly _resultIpImpactAreas: ResultIpImpactAreaRepository,
    protected readonly _resultComplementaryInnovation: ResultsComplementaryInnovationRepository,
    protected readonly _resultComplementaryInnovationFunctions: ResultsComplementaryInnovationsFunctionRepository,
    protected readonly _evidence: EvidencesRepository,
    protected readonly _yearRepository: YearRepository,
    protected readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    protected readonly _complementarynnovationFucntions: ComplementaryInnovationFunctionsRepository
  ) { }

  async findInnovationsAndComplementary() {
    try {
      const results = await this._resultRepository.getResultByTypes([7, 11]);
      return {
        response: results,
        message: 'Successful response',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getStepTwoOne(resultId: number) {
    try {
      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true
        }
      });
      if (!result) {
        throw {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const comInnovation = await this._innovationByResultRepository.getStepTwoOne(result.id);

      return {
        response: comInnovation,
        message: 'Successful response',
        status: HttpStatus.OK,
      }

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }


  async saveSetepTowOne(resultId: number, user: TokenDto, saveData: getInnovationComInterface[]) {
    try {
      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true
        }
      });

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

      const complementaryInnovation = saveData;

      const allComplementary = await this._innovationByResultRepository.find({
        where: {
          result_innovation_package_id: resultId,
          ipsr_role_id: 2
        }
      });

      const existingIds = allComplementary.map(ci => ci.result_id);

      const complementaryInnovationsToSave = complementaryInnovation
        .filter(ci => !existingIds.includes(ci.result_id))
        .map(ci => {
          const newCi = new Ipsr();
          newCi.version_id = version.id;
          newCi.last_updated_by = user.id;
          newCi.created_by = user.id;
          newCi.result_id = ci.result_id;
          newCi.result_innovation_package_id = result.id;
          newCi.ipsr_role_id = 2;
          newCi.created_by = user.id;
          newCi.last_updated_by = user.id;
          newCi.created_date = new Date();
          newCi.last_updated_date = new Date();
          return newCi;
        });

      const complementaryInnovationsToActivate = allComplementary
        .filter(ci => complementaryInnovation.some(e => e.result_id === ci.result_id) && !ci.is_active)
        .map(ci => {
          ci.is_active = true;
          return ci;
        });

      const complementaryInnovationsToInactivate = allComplementary
        .filter(ci => !complementaryInnovation.some(e => e.result_id === ci.result_id) && ci.is_active)
        .map(ci => {
          ci.is_active = false;
          return ci;
        });

      const savePromises = [
        ...complementaryInnovationsToSave.map(ci => this._innovationByResultRepository.save(ci)),
        ...complementaryInnovationsToActivate.map(ci => this._innovationByResultRepository.save(ci)),
        ...complementaryInnovationsToInactivate.map(ci => this._innovationByResultRepository.save(ci)),
      ];

      await Promise.all(savePromises);

      // const result = await this._resultRepository.findOne({
      //   where: {
      //     id: resultId,
      //     is_active: true
      //   }
      // });

      // if (!result) {
      //   throw {
      //     response: result,
      //     message: 'The result was not found',
      //     status: HttpStatus.NOT_FOUND,
      //   };
      // }

      // const vTemp = await this._versionsService.findBaseVersion();
      // if (vTemp.status >= 300) {
      //   throw this._handlersError.returnErrorRes({ error: vTemp });
      // }
      // const version: Version = <Version>vTemp.response;

      // const complementaryInnovation = saveData;

      // const allComplementary = await this._innovationByResultRepository.find({
      //   where: {
      //     result_innovation_package_id: resultId,
      //     ipsr_role_id: 2
      //   }
      // });

      // const existingIds: number[] = allComplementary.map(ac => ac.result_id);

      // const ciToActive = allComplementary.filter(
      //   ac =>
      //     complementaryInnovation.find(ci => ci.result_id == ac.result_id) &&
      //     ac.is_active === false
      // );

      // const ciToInactive = allComplementary.filter(
      //   ac =>
      //     !complementaryInnovation.find(e => e.result_id == ac.result_id) &&
      //     ac.is_active === false
      // );

      // const ciToSave = complementaryInnovation.filter(
      //   ci => !existingIds.includes(ci.result_id)
      // );

      // const saveComplementaryInnovation = [];

      // if (ciToSave?.length > 0) {
      //   for (const entity of ciToSave) {
      //     const newCi = new Ipsr();
      //     newCi.version_id = version.id;
      //     newCi.last_updated_by = user.id;
      //     newCi.created_by = user.id;
      //     newCi.result_id = entity.result_id;
      //     newCi.result_innovation_package_id = result.id;
      //     newCi.ipsr_role_id = 1;
      //     newCi.created_by = user.id;
      //     newCi.last_updated_by = user.id;
      //     newCi.created_date = new Date();
      //     newCi.last_updated_date = new Date();
      //     saveComplementaryInnovation.push(this._innovationByResultRepository.save(entity));
      //   }
      // }

      // if (ciToActive?.length > 0) {
      //   for (const entity of ciToActive) {
      //     entity.is_active = true;
      //     saveComplementaryInnovation.push(this._innovationByResultRepository.save(entity));
      //   }
      // }

      // if (ciToInactive?.length > 0) {
      //   for (const entity of ciToInactive) {
      //     entity.is_active = false;
      //     saveComplementaryInnovation.push(this._innovationByResultRepository.save(entity));
      //   }
      // }

      // if (saveData?.length) {
      //   for (const rbip of saveData) {
      //     let exists: Ipsr = null;
      //     if (rbip?.result_by_innovation_package_id) {
      //       exists = await this._innovationByResultRepository.findOne({
      //         where: {
      //           result_by_innovation_package_id: resultId,
      //           ipsr_role_id: 2
      //         }
      //       });
      //     } else {
      //       exists = await this._innovationByResultRepository.findOne({
      //         where: {
      //           result_id: rbip.result_id,
      //           ipsr_role_id: 2
      //         }
      //       });
      //     }

      //     if (exists) {
      //       await this._innovationByResultRepository.update(
      //         exists.result_by_innovation_package_id,
      //         {
      //           is_active: rbip.is_active,
      //           last_updated_by: user.id
      //         }
      //       );
      //     } else {
      //       await this._innovationByResultRepository.save({
      //         version_id: version.id,
      //         last_updated_by: user.id,
      //         created_by: user.id,
      //         result_id: rbip.result_id,
      //         result_innovation_package_id: result.id,
      //         ipsr_role_id: 2
      //       });
      //     }
      //   }
      // }
      return {
        response: {
          // saveComplementaryInnovation
          complementaryInnovationsToSave,
          complementaryInnovationsToActivate,
          complementaryInnovationsToInactivate
        },
        message: 'Data was saved correctly',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findComplementaryInnovationFuctions() {
    try {
      const complementaryFunctions = await this._complementarynnovationFucntions.find();

      return {
        response: complementaryFunctions,
        message: 'Successful response',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveComplementaryInnovation(resultId: number, User: TokenDto, CreateComplementaryInnovationDto: CreateComplementaryInnovationDto) {
    try {

      const resultIpResults: Result[] = await this._resultRepository.findBy({ id: resultId });
      const year: Year[] = await this._yearRepository.findBy({ active: true });

      if (!resultIpResults) {
        throw {
          response: { valid: false },
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (!CreateComplementaryInnovationDto) {
        throw {
          response: { valid: false },
          message: 'Missing fields',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const vTemp = await this._versionsService.findBaseVersion();
      if (vTemp.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: vTemp });
      }
      const version: Version = <Version>vTemp.response;

      const last_code = await this._resultRepository.getLastResultCode();

      const createResult: Result = await this._resultRepository.save({
        title: CreateComplementaryInnovationDto.title,
        description: CreateComplementaryInnovationDto.description,
        initiative_id: CreateComplementaryInnovationDto.initiative_id,
        result_code: last_code + 1,
        result_level_id: 4,
        result_type_id: 11,
        year: year[0].year,
        version_id: version.id,
        created_by: User.id,
        last_updated_by: User.id,
        created_date: new Date(),
        last_updated_date: new Date(),
      });

      const newResult = createResult.id;

      const newInnovationByInitiative: ResultsByInititiative = await this._resultByInitiativeRepository.save({
        result_id: newResult,
        initiative_id: CreateComplementaryInnovationDto.initiative_id,
        initiative_role_id: 1,
        version_id: version.id,
        created_by: User.id,
        last_updated_by: User.id
      });

      const newResultIpResults: Ipsr = await this._innovationByResultRepository.save({
        result_innovation_package_id: resultIpResults[0].id,
        result_id: newResult,
        ipsr_role_id: 2,
        created_by: User.id,
        last_updated_by: User.id,
        created_date: new Date(),
        last_updated_date: new Date(),
        version_id: version.id
      });

      const newResultComplemetaryInnovation: ResultsComplementaryInnovation = await this._resultComplementaryInnovation.save({
        result_id: newResult,
        short_title: CreateComplementaryInnovationDto.short_title,
        other_funcions: CreateComplementaryInnovationDto.other_funcions,
        created_by: User.id,
        last_updated_by: User.id,
        created_date: new Date(),
        last_updated_date: new Date(),
        version_id: version.id
      });

      const resultComplementaryInnovationId = newResultComplemetaryInnovation.result_complementary_innovation_id;
      const complementaryFunctions = CreateComplementaryInnovationDto.complementaryFunctions.map(cf => cf.complementary_innovation_functions_id);

      const saveCF = [];
      if (complementaryFunctions.length > 0) {
        for (const entity of complementaryFunctions) {
          const newCF = new ResultsComplementaryInnovationsFunction();
          newCF.result_complementary_innovation_id = +resultComplementaryInnovationId;
          newCF.complementary_innovation_function_id = entity;
          newCF.created_by = User.id;
          newCF.last_updated_by = User.id;
          newCF.created_date = new Date();
          newCF.last_updated_date = new Date();
          newCF.version_id = version.id;
          saveCF.push(this._resultComplementaryInnovationFunctions.save(newCF));
        }
      }

      const referenceMaterials = CreateComplementaryInnovationDto.referenceMaterials.map(rm => rm.link);
      if (referenceMaterials.length > 3) {
        return {
          response: {
            valid: false
          },
          message: 'The Reference Materials must be three',
          status: HttpStatus.BAD_REQUEST
        }
      }

      const saveEvidence = [];
      if (referenceMaterials.length > 0) {
        for (const entity of referenceMaterials) {
          const newMaterial = new Evidence();
          newMaterial.result_id = newResult;
          newMaterial.link = entity;
          newMaterial.created_by = User.id;
          newMaterial.last_updated_by = User.id;
          newMaterial.creation_date = new Date();
          newMaterial.last_updated_date = new Date();
          newMaterial.version_id = version.id;
          saveEvidence.push(this._evidence.save(newMaterial));
        }
      }

      const resultCF = await Promise.all(saveCF);
      const resultEvidence = await Promise.all(saveEvidence);

      return {
        response: {
          createResult,
          newResultIpResults,
          newResultComplemetaryInnovation,
          resultCF,
          resultEvidence
        },
        message: 'The Result Complementary Innovation have been saved successfully',
        status: HttpStatus.OK
      }

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }

  }
}
