import { HttpStatus, Injectable } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { GetInnovationComInterface, IpsrRepository } from '../ipsr.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { ResultIpEoiOutcomeRepository } from './repository/result-ip-eoi-outcomes.repository';
import { ResultIpAAOutcomeRepository } from './repository/result-ip-action-area-outcome.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../result-ip-measures/result-ip-measures.repository';
import { ResultIpImpactAreaRepository } from './repository/result-ip-impact-area-targets.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Ipsr } from '../entities/ipsr.entity';
import { ResultsComplementaryInnovationRepository } from '../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { ResultsComplementaryInnovationsFunctionRepository } from '../results-complementary-innovations-functions/repositories/results-complementary-innovations-function.repository';
import { ResultsComplementaryInnovationsFunction } from '../results-complementary-innovations-functions/entities/results-complementary-innovations-function.entity';
import { Evidence } from '../../../api/results/evidences/entities/evidence.entity';
import { EvidencesRepository } from '../../../api/results/evidences/evidences.repository';
import { CreateComplementaryInnovationDto } from './dto/create-complementary-innovation.dto';
import { Result } from '../../../api/results/entities/result.entity';
import { YearRepository } from '../../../api/results/years/year.repository';
import { ResultByInitiativesRepository } from 'src/api/results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsComplementaryInnovation } from '../results-complementary-innovations/entities/results-complementary-innovation.entity';
import { ComplementaryInnovationFunctionsRepository } from '../results-complementary-innovations-functions/repositories/complementary-innovation-functions.repository';
import { UpdateComplementaryInnovationDto } from './dto/update-innovation-pathway.dto';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { VersioningService } from '../../versioning/versioning.service';

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
    protected readonly _complementarynnovationFucntions: ComplementaryInnovationFunctionsRepository,
    private readonly _versioningService: VersioningService,
  ) {}

  async findInnovationsAndComplementary() {
    try {
      const results = await this._resultRepository.getResultByTypes([7, 11]);
      return {
        response: results,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getStepTwoOne(resultId: number) {
    try {
      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true,
        },
      });
      if (!result) {
        throw {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const comInnovation =
        await this._innovationByResultRepository.getStepTwoOne(result.id);

      return {
        response: comInnovation,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveSetepTowOne(
    resultId: number,
    user: TokenDto,
    saveData: GetInnovationComInterface[],
  ) {
    try {
      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true,
        },
      });

      if (!result) {
        throw {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.IPSR,
      );
      if (!version) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }

      const complementaryInnovation = saveData;

      const allComplementary = await this._innovationByResultRepository.find({
        where: {
          result_innovation_package_id: resultId,
          ipsr_role_id: 2,
        },
      });

      const existingIds = allComplementary.map((ci) => ci.result_id);

      const complementaryInnovationsToSave = complementaryInnovation
        .filter((ci) => !existingIds.includes(ci.result_id))
        .map((ci) => {
          const newCi = new Ipsr();
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
        .filter(
          (ci) =>
            complementaryInnovation.some((e) => e.result_id === ci.result_id) &&
            !ci.is_active,
        )
        .map((ci) => {
          ci.is_active = true;
          return ci;
        });

      const complementaryInnovationsToInactivate = allComplementary
        .filter(
          (ci) =>
            !complementaryInnovation.some(
              (e) => e.result_id === ci.result_id,
            ) && ci.is_active,
        )
        .map((ci) => {
          ci.is_active = false;
          return ci;
        });

      const savePromises = [
        ...complementaryInnovationsToSave.map((ci) =>
          this._innovationByResultRepository.save(ci),
        ),
        ...complementaryInnovationsToActivate.map((ci) =>
          this._innovationByResultRepository.save(ci),
        ),
        ...complementaryInnovationsToInactivate.map((ci) =>
          this._innovationByResultRepository.save(ci),
        ),
      ];

      await Promise.all(savePromises);

      return {
        response: {
          complementaryInnovationsToSave,
          complementaryInnovationsToActivate,
          complementaryInnovationsToInactivate,
        },
        message: 'Data was saved correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findComplementaryInnovationFuctions() {
    try {
      const complementaryFunctions =
        await this._complementarynnovationFucntions.find();

      return {
        response: complementaryFunctions,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveComplementaryInnovation(
    resultId: number,
    User: TokenDto,
    CreateComplementaryInnovationDto: CreateComplementaryInnovationDto,
  ) {
    try {
      const resultIpResults: Result[] = await this._resultRepository.findBy({
        id: resultId,
      });
      const findInit =
        await this._resultByInitiativeRepository.getOwnerInitiativeByResult(
          resultId,
        );
      const year = await this._yearRepository.findOne({
        where: { active: true },
      });

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

      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.IPSR,
      );
      if (!version) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }

      const last_code = await this._resultRepository.getLastResultCode();

      const createResult: Result = await this._resultRepository.save({
        title: CreateComplementaryInnovationDto.title,
        description: CreateComplementaryInnovationDto.description,
        initiative_id: CreateComplementaryInnovationDto.initiative_id,
        result_code: last_code + 1,
        result_level_id: 4,
        result_type_id: 11,
        year: year.year,
        version_id: version.id,
        created_by: User.id,
        last_updated_by: User.id,
        created_date: new Date(),
        last_updated_date: new Date(),
      });

      const newResult = createResult.id;

      await this._resultByInitiativeRepository.save({
        result_id: newResult,
        initiative_id: CreateComplementaryInnovationDto.initiative_id,
        initiative_role_id: 1,
        created_by: User.id,
        last_updated_by: User.id,
      });

      const newResultIpResults: Ipsr =
        await this._innovationByResultRepository.save({
          result_innovation_package_id: resultIpResults[0].id,
          result_id: newResult,
          ipsr_role_id: 2,
          created_by: User.id,
          last_updated_by: User.id,
        });

      const newResultComplemetaryInnovation: ResultsComplementaryInnovation =
        await this._resultComplementaryInnovation.save({
          result_id: newResult,
          short_title: CreateComplementaryInnovationDto.short_title,
          other_funcions: CreateComplementaryInnovationDto.other_funcions,
          created_by: User.id,
          projects_organizations_working_on_innovation:
            CreateComplementaryInnovationDto.projects_organizations_working_on_innovation,
          specify_projects_organizations:
            CreateComplementaryInnovationDto.projects_organizations_working_on_innovation ==
            true
              ? CreateComplementaryInnovationDto.specify_projects_organizations
              : null,
          last_updated_by: User.id,
        });

      const resultComplementaryInnovationId =
        newResultComplemetaryInnovation.result_complementary_innovation_id;
      const complementaryFunctions =
        CreateComplementaryInnovationDto.complementaryFunctions.map(
          (cf) => cf.complementary_innovation_functions_id,
        );

      const saveCF = [];
      if (complementaryFunctions.length > 0) {
        for (const entity of complementaryFunctions) {
          const newCF = new ResultsComplementaryInnovationsFunction();
          newCF.result_complementary_innovation_id =
            +resultComplementaryInnovationId;
          newCF.complementary_innovation_function_id = entity;
          newCF.created_by = User.id;
          newCF.last_updated_by = User.id;
          newCF.created_date = new Date();
          newCF.last_updated_date = new Date();
          saveCF.push(this._resultComplementaryInnovationFunctions.save(newCF));
        }
      }

      const referenceMaterials =
        CreateComplementaryInnovationDto.referenceMaterials.map(
          (rm) => rm.link,
        );
      if (referenceMaterials.length > 3) {
        return {
          response: {
            valid: false,
          },
          message: 'The Reference Materials must be three',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const saveEvidence = [];
      if (referenceMaterials.length > 0) {
        for (const entity of referenceMaterials) {
          const newMaterial = new Evidence();
          newMaterial.result_id = newResult;
          newMaterial.link = entity;
          newMaterial.evidence_type_id = 4;
          newMaterial.created_by = User.id;
          newMaterial.last_updated_by = User.id;
          newMaterial.creation_date = new Date();
          newMaterial.last_updated_date = new Date();
          saveEvidence.push(this._evidence.save(newMaterial));
        }
      }

      const resultCF = await Promise.all(saveCF);
      const resultEvidence = await Promise.all(saveEvidence);

      return {
        response: {
          initiative: findInit,
          createResult,
          newResultIpResults,
          newResultComplemetaryInnovation,
          resultCF,
          resultEvidence,
        },
        message:
          'The Result Complementary Innovation have been saved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getComplementaryInnovationById(complementaryInnovationId: number) {
    try {
      const findResult: Result = await this._resultRepository.findOneBy({
        id: complementaryInnovationId,
        is_active: true,
      });
      if (!findResult) {
        return {
          response: { valid: false },
          message: 'The Result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const findResultComplementaryInnovation: ResultsComplementaryInnovation =
        await this._resultComplementaryInnovation.findOne({
          where: {
            result_id: complementaryInnovationId,
            is_active: true,
          },
        });

      const findComplementaryInnovationFuctions: ResultsComplementaryInnovationsFunction[] =
        await this._resultComplementaryInnovationFunctions.find({
          where: {
            result_complementary_innovation_id:
              findResultComplementaryInnovation?.result_complementary_innovation_id,
            is_active: true,
          },
        });

      const evidence: Evidence[] = await this._evidence.find({
        where: {
          result_id: findResult.id,
          is_active: 1,
        },
      });

      return {
        response: {
          findResult,
          findResultComplementaryInnovation,
          findComplementaryInnovationFuctions,
          evidence,
        },
        message:
          'The Result Complementary Innovation have been found successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async updateComplementaryInnovation(
    complementaryInnovationId: number,
    User: TokenDto,
    updateComplementaryInnovationDto: UpdateComplementaryInnovationDto,
  ) {
    try {
      const {
        title,
        short_title,
        description,
        other_funcions,
        complementaryFunctions,
        referenceMaterials,
        projects_organizations_working_on_innovation,
        specify_projects_organizations,
      } = updateComplementaryInnovationDto;

      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.IPSR,
      );
      if (!version) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }

      const findResult: Result = await this._resultRepository.findOneBy({
        id: complementaryInnovationId,
        is_active: true,
      });
      if (!findResult) {
        return {
          response: { valid: false },
          message: 'The Result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const findComplementaryInnovation: ResultsComplementaryInnovation =
        await this._resultComplementaryInnovation.findOne({
          where: {
            result_id: complementaryInnovationId,
            is_active: true,
          },
        });
      if (!findComplementaryInnovation) {
        return {
          response: { valid: false },
          message: 'The Complementary Innovation was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      await this._resultRepository.update(findResult.id, {
        title,
        description,
        last_updated_by: User.id,
      });

      await this._resultComplementaryInnovation.update(
        findComplementaryInnovation.result_complementary_innovation_id,
        {
          short_title,
          other_funcions,
          projects_organizations_working_on_innovation,
          specify_projects_organizations,
          last_updated_by: User.id,
        },
      );

      const updateCF = [];
      const existingComplementaryFunctions: ResultsComplementaryInnovationsFunction[] =
        await this._resultComplementaryInnovationFunctions.findBy({
          result_complementary_innovation_id:
            findComplementaryInnovation.result_complementary_innovation_id,
          is_active: true,
        });

      for (const ecf of existingComplementaryFunctions) {
        const isFound = complementaryFunctions.some(
          (cf) =>
            cf.complementary_innovation_functions_id ===
            ecf.complementary_innovation_function_id,
        );
        if (!isFound) {
          ecf.results_complementary_innovations_function_id;
          ecf.is_active = false;
          ecf.last_updated_by = User.id;
          updateCF.push(
            await this._resultComplementaryInnovationFunctions.save(ecf),
          );
        }
      }

      const saveCF = [];
      if (complementaryFunctions.length) {
        for (const cf of complementaryFunctions) {
          const findComplementaryInnovationFuctions: ResultsComplementaryInnovationsFunction =
            await this._resultComplementaryInnovationFunctions.findOne({
              where: {
                result_complementary_innovation_id:
                  findComplementaryInnovation.result_complementary_innovation_id,
                complementary_innovation_function_id:
                  cf.complementary_innovation_functions_id,
                is_active: true,
              },
            });

          if (!findComplementaryInnovationFuctions) {
            const newCF = new ResultsComplementaryInnovationsFunction();
            newCF.result_complementary_innovation_id =
              findComplementaryInnovation.result_complementary_innovation_id;
            newCF.complementary_innovation_function_id =
              cf.complementary_innovation_functions_id;
            newCF.created_by = User.id;
            newCF.last_updated_by = User.id;
            saveCF.push(
              await this._resultComplementaryInnovationFunctions.save(newCF),
            );
          }
        }
      }

      const referenceMaterialsObj = referenceMaterials.map((rm) => rm.link);
      if (referenceMaterialsObj.length > 3) {
        return {
          response: {
            valid: false,
          },
          message: 'The Reference Materials must be three',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const evidenceExist = await this._evidence.find({
        where: {
          result_id: complementaryInnovationId,
          is_active: 1,
          evidence_type_id: 4,
        },
      });

      for (const e of evidenceExist) {
        const isFound = referenceMaterialsObj.some((rm) => rm === e.link);

        if (!isFound) {
          await this._evidence.update(e.id, {
            is_active: 0,
            last_updated_by: User.id,
          });
        }
      }

      const saveEvidence = [];
      if (referenceMaterialsObj.length > 0) {
        for (const entity of referenceMaterials) {
          const findEvidence: Evidence = await this._evidence.findOne({
            where: {
              result_id: complementaryInnovationId,
              link: entity.link,
              is_active: 1,
            },
          });

          if (!findEvidence) {
            const newMaterial = new Evidence();
            newMaterial.result_id = complementaryInnovationId;
            newMaterial.link = entity.link;
            newMaterial.evidence_type_id = 4;
            newMaterial.created_by = User.id;
            newMaterial.last_updated_by = User.id;
            newMaterial.creation_date = new Date();
            newMaterial.last_updated_date = new Date();
            saveEvidence.push(await this._evidence.save(newMaterial));
          }
        }
      }

      const data = await this.getComplementaryInnovationById(
        complementaryInnovationId,
      );

      return {
        response: data.response,
        message:
          'The Result Complementary Innovation have been updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async inactiveComplementaryInnovation(
    complementaryInnovationId: number,
    User: TokenDto,
  ) {
    try {
      const findResult: Result = await this._resultRepository.findOneBy({
        id: complementaryInnovationId,
        is_active: true,
      });
      if (!findResult) {
        return {
          response: { valid: false },
          message: 'The Result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const findResultByInnovation: Ipsr[] =
        await this._innovationByResultRepository.find({
          where: {
            result_id: complementaryInnovationId,
            ipsr_role_id: 2,
            is_active: true,
          },
        });
      if (!findResultByInnovation) {
        return {
          response: { valid: false },
          message: 'The Result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const findComplementaryInnovation: ResultsComplementaryInnovation =
        await this._resultComplementaryInnovation.findOne({
          where: {
            result_id: complementaryInnovationId,
            is_active: true,
          },
        });

      await this._resultRepository.update(findResult.id, {
        is_active: false,
        last_updated_by: User.id,
      });

      for (const cf of findResultByInnovation) {
        await this._innovationByResultRepository.update(
          cf.result_by_innovation_package_id,
          {
            is_active: false,
            last_updated_by: User.id,
          },
        );
      }

      await this._resultComplementaryInnovation.update(
        findComplementaryInnovation.result_complementary_innovation_id,
        {
          is_active: false,
          last_updated_by: User.id,
        },
      );

      return {
        response: { valid: true },
        title:
          'The Result Complementary Innovation have been inactive successfully',
        message:
          'The Result Complementary Innovation have been inactive successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}

export class getEnablersType {
  complementary_innovation_enabler_types_id: string;
  group: string;
  type: string;
  level: number;
}
