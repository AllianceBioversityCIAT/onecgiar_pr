import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateSummaryDto } from './dto/create-summary.dto';
import { UpdateSummaryDto } from './dto/update-summary.dto';
import { InnovationUseDto } from './dto/create-innovation-use.dto';
import { ResultsInnovationsUseRepository } from './repositories/results-innovations-use.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsInnovationsUse } from './entities/results-innovations-use.entity';
import { VersionsService } from '../versions/versions.service';
import { Version } from '../versions/entities/version.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsInnovationsUseMeasuresRepository } from './repositories/results-innovations-use-measures.repository';
import { ResultsInnovationsUseMeasures } from './entities/results-innovations-use-measures.entity';
import { capdevDto } from './dto/create-capacity-developents.dto';
import { ResultsCapacityDevelopmentsRepository } from './repositories/results-capacity-developments.repository';
import { ResultsCapacityDevelopments } from './entities/results-capacity-developments.entity';
import { ResultByIntitutionsRepository } from '../results_by_institutions/result_by_intitutions.repository';
import { ResultsByInstitution } from '../results_by_institutions/entities/results_by_institution.entity';
import { CreateInnovationDevDto } from './dto/create-innovation-dev.dto';
import { ResultsInnovationsDevRepository } from './repositories/results-innovations-dev.repository';
import { ResultsInnovationsDev } from './entities/results-innovations-dev.entity';
import { ResultRepository } from '../result.repository';
import { PolicyChangesDto } from './dto/create-policy-changes.dto';
import { ResultsPolicyChanges } from './entities/results-policy-changes.entity';
import { ResultsPolicyChangesRepository } from './repositories/results-policy-changes.repository';

@Injectable()
export class SummaryService {

  constructor(
    private readonly _resultsInnovationsUseRepository: ResultsInnovationsUseRepository,
    private readonly _esultsInnovationsUseMeasuresRepository: ResultsInnovationsUseMeasuresRepository,
    private readonly _resultsCapacityDevelopmentsRepository: ResultsCapacityDevelopmentsRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    private readonly _resultsPolicyChangesRepository: ResultsPolicyChangesRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionsService: VersionsService,
    private readonly _handlersError: HandlersError
  ) { }

  create(createSummaryDto: CreateSummaryDto) {
    return 'This action adds a new summary';
  }

  findAll() {
    return `This action returns all summary`;
  }

  findOne(id: number) {
    return `This action returns a #${id} summary`;
  }

  update(id: number, updateSummaryDto: UpdateSummaryDto) {
    return `This action updates a #${id} summary`;
  }

  remove(id: number) {
    return `This action removes a #${id} summary`;
  }

  /**
   * 
   * @param innovation 
   * @param resultId 
   * @param user 
   * @returns 
   */
  async saveInnovationUse(innovation: InnovationUseDto, resultId: number, user: TokenDto) {
    try {
      const { result_innovation_use_id, female_using, male_using, other } = innovation;
      const innExists = await this._resultsInnovationsUseRepository.InnovatonUseExists(resultId);
      let InnovationUse: ResultsInnovationsUse = undefined;
      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      if (innExists) {
        innExists.female_using = female_using;
        innExists.male_using = male_using;
        innExists.last_updated_by = user.id;
        InnovationUse = await this._resultsInnovationsUseRepository.save(innExists);
      } else {

        const newInne = new ResultsInnovationsUse();
        newInne.created_by = user.id;
        newInne.last_updated_by = user.id;
        newInne.female_using = female_using;
        newInne.male_using = male_using;
        newInne.version_id = vrs.id;
        newInne.results_id = resultId;
        InnovationUse = await this._resultsInnovationsUseRepository.save(newInne);
      }

      if (other?.length) {
        const measureList = other.filter(el => !!el.result_innovations_use_measure_id).map(d => d.result_innovations_use_measure_id);
        await this._esultsInnovationsUseMeasuresRepository.updateInnovatonUseMeasures(InnovationUse.result_innovation_use_id, measureList, user.id);
        let tesultsInnovationsUseMeasuresList: ResultsInnovationsUseMeasures[] = [];
        for (let index = 0; index < other.length; index++) {
          const { quantity, unit_of_measure, result_innovations_use_measure_id } = other[index];
          const innMesExists = await this._esultsInnovationsUseMeasuresRepository.innovatonUseMeasuresExists(result_innovations_use_measure_id);
          if (innMesExists) {
            innMesExists.last_updated_by = user.id;
            innMesExists.quantity = quantity;
            innMesExists.unit_of_measure = unit_of_measure;
            tesultsInnovationsUseMeasuresList.push(innMesExists);
          } else {
            const newInnMes = new ResultsInnovationsUseMeasures();
            newInnMes.created_by = user.id;
            newInnMes.last_updated_by = user.id;
            newInnMes.quantity = quantity;
            newInnMes.unit_of_measure = unit_of_measure;
            newInnMes.result_innovation_use_id = InnovationUse.result_innovation_use_id;
            newInnMes.version_id = vrs.id;
            tesultsInnovationsUseMeasuresList.push(newInnMes);
          }
        }
        await this._esultsInnovationsUseMeasuresRepository.save(tesultsInnovationsUseMeasuresList);
      } else {
        await this._esultsInnovationsUseMeasuresRepository.updateInnovatonUseMeasures(InnovationUse.result_innovation_use_id, [], user.id);
      }

      return {
        response: InnovationUse,
        message: 'Results Innovations Use has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }


  }

  /**
   * 
   * @param resultId 
   * @returns 
   */
  async getInnovationUse(resultId: number) {
    try {
      const innExists = await this._resultsInnovationsUseRepository.InnovatonUseExists(resultId);
      if (!innExists) {
        throw {
          response: {},
          message: 'Results Innovations Use not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const allInnUseMes = await this._esultsInnovationsUseMeasuresRepository.getAllResultInnovationsUseMeasureByInnoUseId(innExists.result_innovation_use_id);
      return {
        response: {
          ...innExists,
          other: allInnUseMes
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * 
   * @param capdev 
   * @param resultId 
   * @param user 
   */
  async saveCapacityDevelopents(capdev: capdevDto, resultId: number, user: TokenDto) {
    try {
      const { result_capacity_development_id, female_using, male_using, capdev_delivery_method_id, capdev_term_id, institutions } = capdev;
      const capDevExists = await this._resultsCapacityDevelopmentsRepository.capDevExists(resultId);
      let CapDevData: ResultsCapacityDevelopments = undefined;
      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      if (capDevExists) {
        capDevExists.female_using = female_using;
        capDevExists.male_using = male_using;
        capDevExists.last_updated_by = user.id;
        capDevExists.capdev_delivery_method_id = capdev_delivery_method_id;
        capDevExists.capdev_term_id = capdev_term_id;
        CapDevData = await this._resultsCapacityDevelopmentsRepository.save(capDevExists);
      } else {
        const newCapDev = new ResultsCapacityDevelopments();
        newCapDev.created_by = user.id;
        newCapDev.last_updated_by = user.id;
        newCapDev.female_using = female_using;
        newCapDev.male_using = male_using;
        newCapDev.version_id = vrs.id;
        newCapDev.result_id = resultId;
        newCapDev.capdev_delivery_method_id = capdev_delivery_method_id;
        newCapDev.capdev_term_id = capdev_term_id;
        CapDevData = await this._resultsCapacityDevelopmentsRepository.save(newCapDev);
      }

      if (institutions?.length) {
        let institutionsList: ResultsByInstitution[] = [];
        await this._resultByIntitutionsRepository.updateGenericIstitutions(resultId, institutions, 3, user.id);
        for (let index = 0; index < institutions.length; index++) {
          const { institutions_id } = institutions[index];
          const instiExists = await this._resultByIntitutionsRepository.getGenericResultByInstitutionExists(resultId, institutions_id, 3);
          if (!instiExists) {
            const newInstitution = new ResultsByInstitution();
            newInstitution.institution_roles_id = 3;
            newInstitution.created_by = user.id;
            newInstitution.last_updated_by = user.id;
            newInstitution.version_id = vrs.id;
            newInstitution.institutions_id = institutions_id;
            newInstitution.result_id = resultId;
            institutionsList.push(newInstitution);
          }
        }
        await this._resultByIntitutionsRepository.save(institutionsList);
      } else {
        await this._resultByIntitutionsRepository.updateGenericIstitutions(resultId, [], 3, user.id);
      }


      return {
        response: CapDevData,
        message: 'Capacity Developents has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * 
   * @param resultId 
   * @returns 
   */
  async getCapacityDevelopents(resultId: number) {
    try {
      const capDevExists = await this._resultsCapacityDevelopmentsRepository.capDevExists(resultId);
      const capDepInstitutions = await this._resultByIntitutionsRepository.getGenericAllResultByInstitutionByRole(resultId, 3);

      if (!capDevExists) {
        throw {
          response: {},
          message: 'Capacity Developents not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: {
          ...capDevExists,
          institutions: capDepInstitutions
        },
        message: 'Capacity Developents has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * 
   * @param createInnovationDevDto 
   * @param resultId 
   * @param user 
   * @returns 
   */
  async saveInnovationDev(createInnovationDevDto: CreateInnovationDevDto, resultId: number, user: TokenDto) {
    try {
      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      const innDevExists = await this._resultsInnovationsDevRepository.InnovationDevExists(resultId);
      const { evidences_justification, innovation_characterization_id,
        innovation_collaborators, innovation_developers, innovation_nature_id,
        innovation_readiness_level_id, is_new_variety, number_of_varieties, readiness_level,
        result_innovation_dev_id, short_title } = createInnovationDevDto;

      let InnDevRes:ResultsInnovationsDev = undefined;
      if (innDevExists) {
        innDevExists.short_title = short_title;
        innDevExists.last_updated_by = user.id;
        innDevExists.is_new_variety = is_new_variety;
        innDevExists.readiness_level = readiness_level;
        innDevExists.number_of_varieties = number_of_varieties;
        innDevExists.innovation_nature_id = innovation_nature_id;
        innDevExists.innovation_developers = innovation_developers;
        innDevExists.evidences_justification = evidences_justification;
        innDevExists.innovation_collaborators = innovation_collaborators;
        innDevExists.result_innovation_dev_id = result_innovation_dev_id;
        innDevExists.innovation_readiness_level_id = innovation_readiness_level_id;
        innDevExists.innovation_characterization_id = innovation_characterization_id;
        InnDevRes = await this._resultsInnovationsDevRepository.save(innDevExists);
      } else {
        const newInnDev = new ResultsInnovationsDev();
        newInnDev.version_id = vrs.id;
        newInnDev.created_by = user.id;
        newInnDev.results_id = resultId;
        newInnDev.last_updated_by = user.id;
        newInnDev.short_title = short_title;
        newInnDev.is_new_variety = is_new_variety;
        newInnDev.readiness_level = readiness_level;
        newInnDev.number_of_varieties = number_of_varieties;
        newInnDev.innovation_nature_id = innovation_nature_id;
        newInnDev.innovation_developers = innovation_developers;
        newInnDev.evidences_justification = evidences_justification;
        newInnDev.innovation_collaborators = innovation_collaborators;
        newInnDev.result_innovation_dev_id = result_innovation_dev_id;
        newInnDev.innovation_readiness_level_id = innovation_readiness_level_id;
        newInnDev.innovation_characterization_id = innovation_characterization_id;
        InnDevRes = await this._resultsInnovationsDevRepository.save(newInnDev);
      }

      return {
        response: InnDevRes,
        message: 'Results Innovations Dev has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * 
   * @param resultId 
   * @returns 
   */
  async getInnovationDev(resultId: number) {
    try {
      const innDevExists = await this._resultsInnovationsDevRepository.InnovationDevExists(resultId);
      if (!innDevExists) {
        throw {
          response: {},
          message: 'Results Innovations Dev not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const result = await this._resultRepository.getResultById(resultId);
      return {
        response: {
          ...innDevExists,
          result: result
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * 
   * @param policyChangesDto 
   * @param resultId 
   * @param user 
   * @returns 
   */
  async savePolicyChanges(policyChangesDto: PolicyChangesDto, resultId: number, user: TokenDto) {
    try {
      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      const resultsPolicyChanges = await this._resultsPolicyChangesRepository.ResultsPolicyChangesExists(resultId);
      const { amount,institutions,policy_stage_id,policy_type_id} = policyChangesDto;

      let policyChangesData:ResultsPolicyChanges = undefined;
      if (resultsPolicyChanges) {
        resultsPolicyChanges.amount = amount;
        resultsPolicyChanges.last_updated_by = user.id;
        resultsPolicyChanges.policy_stage_id = policy_stage_id;
        resultsPolicyChanges.policy_type_id = policy_type_id;
        policyChangesData = await this._resultsPolicyChangesRepository.save(resultsPolicyChanges);
      } else {
        const newResultsPolicyChanges = new ResultsPolicyChanges();
        newResultsPolicyChanges.amount = amount;
        newResultsPolicyChanges.policy_stage_id = policy_stage_id;
        newResultsPolicyChanges.policy_type_id = policy_type_id;
        newResultsPolicyChanges.version_id = vrs.id;
        newResultsPolicyChanges.result_id = resultId;
        newResultsPolicyChanges.created_by = user.id;
        newResultsPolicyChanges.last_updated_by = user.id;
        policyChangesData = await this._resultsPolicyChangesRepository.save(newResultsPolicyChanges);
      }
      
      if (institutions?.length) {
        let institutionsList: ResultsByInstitution[] = [];
        await this._resultByIntitutionsRepository.updateGenericIstitutions(resultId, institutions, 4, user.id);
        for (let index = 0; index < institutions.length; index++) {
          const { institutions_id } = institutions[index];
          const instiExists = await this._resultByIntitutionsRepository.getGenericResultByInstitutionExists(resultId, institutions_id, 4);
          if (!instiExists) {
            const newInstitution = new ResultsByInstitution();
            newInstitution.institution_roles_id = 4;
            newInstitution.created_by = user.id;
            newInstitution.last_updated_by = user.id;
            newInstitution.version_id = vrs.id;
            newInstitution.institutions_id = institutions_id;
            newInstitution.result_id = resultId;
            institutionsList.push(newInstitution);
          }
        }
        await this._resultByIntitutionsRepository.save(institutionsList);
      } else {
        await this._resultByIntitutionsRepository.updateGenericIstitutions(resultId, [], 4, user.id);
      }


      return {
        response: policyChangesData,
        message: 'Results Policy Changes has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * 
   * @param resultId 
   * @returns 
   */
  async getPolicyChanges(resultId: number) {
    try {
      const policyChangesExists = await this._resultsPolicyChangesRepository.ResultsPolicyChangesExists(resultId);
      if (!policyChangesExists) {
        throw {
          response: {},
          message: 'Results Innovations Dev not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const policyChangesInstitutions = await this._resultByIntitutionsRepository.getGenericAllResultByInstitutionByRole(resultId, 4);
      return {
        response: {
          ...policyChangesExists,
          institutions: policyChangesInstitutions
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
