import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateResultsPackageTocResultDto } from './dto/create-results-package-toc-result.dto';
import { UpdateResultsPackageTocResultDto } from './dto/update-results-package-toc-result.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsPackageTocResultRepository } from './results-package-toc-result.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { ResultRepository } from '../../results/result.repository';
import { Version } from '../../results/versions/entities/version.entity';
import { NonPooledPackageProjectRepository } from '../non-pooled-package-projects/non-pooled-package-projects.repository';
import { In, Not } from 'typeorm';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultInnovationPackageRepository } from '../result-innovation-package/result-innovation-package.repository';
import { ResultsPackageCenterRepository } from '../results-package-centers/results-package-centers.repository';
import { ResultsPackageByInitiativeRepository } from '../results-package-by-initiatives/results-package-by-initiatives.repository';
import { ResultInnovationPackage } from '../result-innovation-package/entities/result-innovation-package.entity';
import { Result } from '../../results/entities/result.entity';
import { resultPackageTocResultDTO } from './dto/result-package-toc-result.dto';

@Injectable()
export class ResultsPackageTocResultService {

  constructor(
    protected readonly _resultsPackageByInitiativeRepository: ResultsPackageByInitiativeRepository,
    protected readonly _resultsPackageTocResultRepository: ResultsPackageTocResultRepository,
    protected readonly _nonPooledPackageProjectRepository: NonPooledPackageProjectRepository,
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    protected readonly _resultsPackageCenterRepository: ResultsPackageCenterRepository,
    protected readonly _resultRepository: ResultRepository,
    protected readonly _versionsService: VersionsService,
    protected readonly _handlersError: HandlersError,
  ) { }

  async create(cptr: CreateResultsPackageTocResultDto, user: TokenDto) {
    //create Contributing initiative

    //more data
    try {
      const rip = await this._resultInnovationPackageRepository.findOne({ where: { result_innovation_package_id: cptr.result_innovation_package_id, is_active: true } });
      if (!rip) {
        throw {
          response: {
            result_innovation_package_id: cptr.result_innovation_package_id
          },
          message: `result_innovation_package_id: ${cptr.result_innovation_package_id} - does not exist`,
          status: HttpStatus.BAD_REQUEST,
        }
      }
      const result = await this._resultRepository.getResultById(rip.result_id);
      if (!result) {
        throw {
          response: {
            result_id: rip.result_id
          },
          message: `result_id: ${rip.result_id} - does not exist`,
          status: HttpStatus.BAD_REQUEST,
        }
      }

      const vTemp = await this._versionsService.findBaseVersion();
      if (vTemp.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: vTemp });
      }
      const version: Version = <Version>vTemp.response;

      /**
       * !contributing_np_projects
       */
      if (cptr?.contributing_np_projects?.length) {
        const cnpp = cptr.contributing_np_projects;
        const titles = cnpp.map(el => el.grant_title);

        await this._nonPooledPackageProjectRepository.updateNPPackageProjectById(rip.result_innovation_package_id, titles, user.id)
        for (const cpnp of cnpp) {
          if (cpnp?.grant_title?.length) {
            const nonPP = await this._nonPooledPackageProjectRepository.findOne({ where: { results_package_id: rip.result_innovation_package_id, grant_title: cpnp.grant_title } });
            if (nonPP) {
              this._nonPooledPackageProjectRepository.update(
                nonPP.non_pooled_package_project_id,
                {
                  is_active: true,
                  center_grant_id: cpnp.center_grant_id,
                  funder_institution_id: cpnp.funder_institution_id,
                  lead_center_id: cpnp.lead_center_id,
                  last_updated_by: user.id
                }
              );
            } else {
              this._nonPooledPackageProjectRepository.save({
                results_package_id: rip.result_innovation_package_id,
                center_grant_id: cpnp.center_grant_id,
                funder_institution_id: cpnp.funder_institution_id,
                lead_center_id: cpnp.lead_center_id,
                grant_title: cpnp.grant_title,
                last_updated_by: user.id,
                created_by: user.id,
                version_id: version.id
              })
            }
          }
        }
      } else {
        await this._nonPooledPackageProjectRepository.updateNPPackageProjectById(rip.result_innovation_package_id, [], user.id)
      }

      /**
       * !contributing_center
       */
      if (cptr?.contributing_center?.length) {
        const { contributing_center: cc } = cptr;
        const code = cc.map(el => el.code);
        await this._resultsPackageCenterRepository.updateCenter(rip.result_innovation_package_id, code, user.id);

        for (const cenCC of cc) {
          cenCC.primary = cenCC.primary || false;
          const rpC = await this._resultsPackageCenterRepository.findOne({ where: { result_package_id: rip.result_innovation_package_id, center_id: cenCC.code } });
          if (rpC) {
            this._resultsPackageCenterRepository.update(
              rpC.results_package_center_id,
              {
                is_active: true,
                is_primary: cenCC.primary,
                last_updated_by: user.id
              }
            );
          } else {
            this._resultsPackageCenterRepository.save({
              center_id: cenCC.code,
              result_package_id: rip.result_innovation_package_id,
              is_primary: cenCC.primary,
              last_updated_by: user.id,
              created_by: user.id,
              version_id: version.id
            })
          }
        }
      } else {
        await this._resultsPackageCenterRepository.updateCenter(rip.result_innovation_package_id, [], user.id);
      }

      const initRtr = cptr.contributing_initiatives.map(
        (init) => init.id
      );
      await this._resultsPackageByInitiativeRepository.updateResultByInitiative(rip.result_innovation_package_id, [...initRtr, cptr.result_toc_result.initiative_id], user.id);
      const {result_toc_result, contributors_result_toc_result} = cptr;
      
      /**
       * !result_toc_result
       */
      await this.saveResultPackageTocResult(rip, result, user, version, true, result_toc_result);
      const crpi = await this._resultsPackageByInitiativeRepository.find({where: {results_package_id: rip.result_innovation_package_id, initiative_role_id: 2, is_active: true}});
      const iniId = crpi.map((el) => el.initiative_id);
      const saveConInit = contributors_result_toc_result.filter((el) => iniId.includes(el.initiative_id));

      /**
       * !con_result_toc_result
       */
      for (const crtr of saveConInit) {
        await this.saveResultPackageTocResult(rip, result, user, version, false, crtr);
      }

      /**
       * !agregar la logica de cancelacion iniciativa
       */




    } catch (error) {

    }
  }

  protected async saveResultPackageTocResult(rip: ResultInnovationPackage, result: Result, user: TokenDto, version: Version, owner: boolean, rtr: resultPackageTocResultDTO){
    const {planned_result_packages, initiative_id, result_package_toc_result_id, toc_result_id} = rtr;
    const rptr = await this._resultsPackageTocResultRepository.findOne({
      where: {
        results_package_toc_result_id: result_package_toc_result_id, 
        results_package_id: rip.result_innovation_package_id, 
        initiative_id: result.initiative_id
      }
    });
    if(rptr){
      await this._resultsPackageTocResultRepository.update(
        rptr.results_package_toc_result_id,
        {
          toc_result_id: toc_result_id,
          is_active: true,
          last_updated_by: user.id,
          planned_result_packages: planned_result_packages
        }
      )
    }else{
      this._resultsPackageTocResultRepository.save({
        version_id: version.id,
        initiative_id: owner?result.initiative_id: initiative_id,
        toc_result_id: toc_result_id,
        planned_result_packages: planned_result_packages,
        last_updated_by: user.id,
        created_by: user.id
      });
    }
  }

  findAll() {
    return `This action returns all resultsPackageTocResult`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsPackageTocResult`;
  }

  update(id: number, updateResultsPackageTocResultDto: UpdateResultsPackageTocResultDto) {
    return `This action updates a #${id} resultsPackageTocResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsPackageTocResult`;
  }
}
