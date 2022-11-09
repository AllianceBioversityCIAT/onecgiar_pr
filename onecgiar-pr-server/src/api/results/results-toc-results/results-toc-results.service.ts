import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateResultsTocResultDto } from './dto/create-results-toc-result.dto';
import { UpdateResultsTocResultDto } from './dto/update-results-toc-result.dto';
import { ResultsTocResultRepository } from './results-toc-results.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResult } from './entities/results-toc-result.entity';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { NonPooledProject } from '../non-pooled-projects/entities/non-pooled-project.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { ResultsCenter } from '../results-centers/entities/results-center.entity';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultsByInititiative } from '../results_by_inititiatives/entities/results_by_inititiative.entity';
import { VersionsService } from '../versions/versions.service';
import { Version } from '../versions/entities/version.entity';

@Injectable()
export class ResultsTocResultsService {

  constructor(
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _handlersError: HandlersError,
    private readonly _versionsService: VersionsService
  ) { }

  async create(createResultsTocResultDto: CreateResultsTocResultDto, user: TokenDto) {
    try {
      const { contributing_np_projects, result_id, contributing_center, contributing_initiatives } = createResultsTocResultDto;
      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      const titleArray = contributing_np_projects.map(el => el.grant_title);
      if (titleArray.length != titleArray.filter(el => el.length).length) {
        throw {
          response: {},
          message: 'One of the grant titles is empty',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (contributing_center.filter(el => el.primary == true).length > 1) {
        throw {
          response: {},
          message: 'More than one primary center',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (contributing_initiatives?.length) {
        const initiativeArray = contributing_initiatives.map(el => el.id);
        await this._resultByInitiativesRepository.updateResultByInitiative(result_id, initiativeArray, user.id, false);
        let resultsByInititiativeArray: ResultsByInititiative[] = [];
        for (let index = 0; index < contributing_initiatives.length; index++) {
          const exists = await this._resultByInitiativesRepository.getResultsByInitiativeByResultIdAndInitiativeIdAndRole(result_id, contributing_initiatives[index].id, false);
          if (!exists) {
            const newResultByInitiative = new ResultsByInititiative();
            newResultByInitiative.initiative_id = contributing_initiatives[index].id;
            newResultByInitiative.initiative_role_id = 2;
            newResultByInitiative.result_id = result_id;
            newResultByInitiative.last_updated_by = user.id;
            newResultByInitiative.created_by = user.id;
            newResultByInitiative.version_id = vrs.id;
            resultsByInititiativeArray.push(newResultByInitiative);
          }
        }
        await this._resultByInitiativesRepository.save(resultsByInititiativeArray);
      } else {
        await this._resultByInitiativesRepository.updateResultByInitiative(result_id, [], user.id, false);
      }

      if (contributing_np_projects?.length) {

        await this._nonPooledProjectRepository.updateNPProjectById(result_id, titleArray, user.id);
        let resultTocResultArray: NonPooledProject[] = [];
        for (let index = 0; index < contributing_np_projects.length; index++) {
          const resultData = await this._nonPooledProjectRepository.getAllNPProjectById(result_id, contributing_np_projects[index].grant_title)
          if (resultData) {
            resultData.center_grant_id = contributing_np_projects[index].center_grant_id;
            resultData.funder_institution_id = contributing_np_projects[index].funder.institutions_id;
            resultData.lead_center_id = contributing_np_projects[index].lead_center.code;
            resultData.is_active = true;
            resultData.last_updated_by = user.id;
            resultTocResultArray.push(resultData);
          } else {
            const newNpProject = new NonPooledProject();
            newNpProject.results_id = result_id;
            newNpProject.center_grant_id = contributing_np_projects[index].center_grant_id;
            newNpProject.funder_institution_id = contributing_np_projects[index].funder.institutions_id;
            newNpProject.lead_center_id = contributing_np_projects[index].lead_center.code;
            newNpProject.grant_title = contributing_np_projects[index].grant_title;
            newNpProject.created_by = user.id;
            newNpProject.last_updated_by = user.id;
            resultTocResultArray.push(newNpProject);
          }
          await this._nonPooledProjectRepository.save(resultTocResultArray);
        }
      } else {
        await this._nonPooledProjectRepository.updateNPProjectById(result_id, [], user.id);
      }

      if (contributing_center?.length) {
        const centerArray = contributing_center.map(el => el.code);
        await this._resultsCenterRepository.updateCenter(result_id, centerArray, user.id);
        let resultCenterArray: ResultsCenter[] = [];
        for (let index = 0; index < contributing_center.length; index++) {
          const exists = await this._resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId(result_id, contributing_center[index].code);
          if (!exists) {
            const newResultCenter = new ResultsCenter();
            newResultCenter.center_id = contributing_center[index].code;
            newResultCenter.result_id = result_id;
            newResultCenter.created_by = user.id;
            newResultCenter.last_updated_by = user.id;
            newResultCenter.is_primary = contributing_center[index].primary || false;
            resultCenterArray.push(newResultCenter);
          } else if (contributing_center[index]?.primary) {
            exists.is_primary = contributing_center[index].primary;
            exists.last_updated_by = user.id;
            resultCenterArray.push(exists);
          }
        }
        await this._resultsCenterRepository.save(resultCenterArray);
      } else {
        await this._resultsCenterRepository.updateCenter(result_id, [], user.id);
      }

      return {
        response: {},
        message: 'The toc data is successfully created',
        status: HttpStatus.CREATED,
      };

    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async createToc() {

  }

  findAll() {
    return `This action returns all resultsTocResults`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsTocResult`;
  }

  update(id: number, updateResultsTocResultDto: UpdateResultsTocResultDto) {
    return `This action updates a #${id} resultsTocResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsTocResult`;
  }
}
