import { HttpStatus, Injectable, Type } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Version } from '../../results/versions/entities/version.entity';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { IpsrRepository } from '../ipsr.repository';
import { SaveStepFour } from './dto/save-step-four.dto';
import { ResultByInitiativesRepository } from '../../../api/results/results_by_inititiatives/resultByInitiatives.repository';
import { Evidence } from '../../../api/results/evidences/entities/evidence.entity';
import { ResultInitiativeBudgetRepository } from 'src/api/results/result_budget/repositories/result_initiative_budget.repository';
import { ResultsByInititiative } from '../../../api/results/results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultInitiativeBudget } from '../../../api/results/result_budget/entities/result_initiative_budget.entity';
import { In } from 'typeorm';
import { NonPooledProjectRepository } from '../../../api/results/non-pooled-projects/non-pooled-projects.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';

@Injectable()
export class InnovationPathwayStepFourService {
  constructor(
    protected readonly _versionsService: VersionsService,
    protected readonly _handlersError: HandlersError,
    protected readonly _resultRepository: ResultRepository,
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    protected readonly _innovationByResultRepository: IpsrRepository,
    protected readonly _evidenceRepository: EvidencesRepository,
    protected readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    protected readonly _resultInitiativesBudgetRepository: ResultInitiativeBudgetRepository,
    protected readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    protected readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    protected readonly _resultByInstitutionsRepository: ResultByIntitutionsRepository,
    protected readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
  ) { }

  async getStepFour(resultId: number) {
    try {
      return {
        response: { valid: true },
        message: 'Successful response',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveMain(resultId: number, user: TokenDto, saveStepFourDto: SaveStepFour) {
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

      const pictures = await this.savePictures(result.id, user, saveStepFourDto, version);
      const materials = await this.saveMaterials(result.id, user, saveStepFourDto, version);
      const workshop = await this.saveWorkshop(result.id, user, saveStepFourDto, version);
      const initiativeInvestment = await this.saveInitiativeInvestment(result.id, user, saveStepFourDto, version);
      const billateralInvestment = await this.saveBillateralInvestment(result.id, user, saveStepFourDto, version);
      const partnertInvestment = await this.savePartnertInvestment(result.id, user, saveStepFourDto, version);

      const investment = await this._resultInnovationPackageRepository.update(resultId, {
        initiative_unit_time_id: saveStepFourDto.initiative_unit_time_id,
        initiative_expected_time: saveStepFourDto.initiative_expected_time,
        bilateral_unit_time_id: saveStepFourDto.bilateral_unit_time_id,
        bilateral_expected_time: saveStepFourDto.bilateral_expected_time,
        partner_unit_time_id: saveStepFourDto.partner_unit_time_id,
        partner_expected_time: saveStepFourDto.partner_expected_time,
      });



      return {
        response: {
          pictures,
          materials,
          workshop,
          initiativeInvestment,
          billateralInvestment,
          partnertInvestment,
          investment,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async savePictures(resultId: number, user: TokenDto, saveStepFourDto: SaveStepFour, version: Version) {
    const id: number = +resultId;
    try {
      const allEvidence: Evidence[] = await this._evidenceRepository.getPictures(+id);
      const existingPictures = allEvidence.map(e => e.link);
      const existingIds = allEvidence.map(e => e.id);

      const ipsrPictures: any[] = saveStepFourDto.ipsr_pictures;

      if (!ipsrPictures?.length) {
        for (const e of existingIds) {
          await this._evidenceRepository.update(e, {
            is_active: 0,
            last_updated_by: user.id,
            last_updated_date: new Date(),
          })
        }
        throw {
          message: 'Picture was not found',
          status: HttpStatus.NOT_FOUND,
        }
      }

      const picturesToActive = allEvidence.filter(
        ae =>
          ipsrPictures.find(e => e.link === ae.link) &&
          ae.is_active === 0
      );

      const picturesToInactive = allEvidence.filter(
        ae =>
          !ipsrPictures.find(e => e.link === ae.link) &&
          ae.is_active === 1
      );

      const picturesToSave = ipsrPictures?.filter(
        ip => !existingPictures.includes(ip.link)
      );

      let savePictures: Evidence[] = [];

      if (picturesToSave?.length > 0) {
        for (const entity of picturesToSave) {
          const newMaterials = new Evidence();
          newMaterials.result_id = resultId;
          newMaterials.link = entity.link;
          newMaterials.evidence_type_id = 3;
          newMaterials.version_id = version.id;
          newMaterials.created_by = user.id;
          newMaterials.creation_date = new Date();
          newMaterials.last_updated_by = user.id;
          newMaterials.last_updated_date = new Date();
          savePictures.push(await this._evidenceRepository.save(newMaterials));
        }
      };

      if (picturesToActive?.length > 0) {
        for (const entity of picturesToActive) {
          entity.is_active = 1;
          entity.last_updated_by = user.id;
          entity.last_updated_date = new Date();
          savePictures.push(await this._evidenceRepository.save(entity));
        }
      };

      if (picturesToInactive?.length > 0) {
        for (const entity of picturesToInactive) {
          entity.is_active = 0;
          entity.last_updated_by = user.id;
          entity.last_updated_date = new Date();
          savePictures.push(await this._evidenceRepository.save(entity));
        }
      };

      return {
        savePictures
      };

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveMaterials(resultId: number, user: TokenDto, saveStepFourDto: SaveStepFour, version: Version) {
    const id: number = +resultId;
    try {
      const allEvidence: Evidence[] = await this._evidenceRepository.getMaterials(+id);
      const existingMaterials = allEvidence.map(e => e.link);
      const existingIds = allEvidence.map(e => e.id);

      const ipsrMaterials: any[] = saveStepFourDto.ipsr_materials;

      if (!ipsrMaterials?.length) {
        for (const e of existingIds) {
          await this._evidenceRepository.update(e, {
            is_active: 0,
            last_updated_by: user.id,
            last_updated_date: new Date(),
          })
        }
        throw {
          message: 'Materials was not found',
          status: HttpStatus.NOT_FOUND,
        }
      }

      const materialsToActive = allEvidence.filter(
        ae =>
          ipsrMaterials.find(e => e.link === ae.link) &&
          ae.is_active === 0
      );

      const materialsToInactive = allEvidence.filter(
        ae =>
          !ipsrMaterials.find(e => e.link === ae.link) &&
          ae.is_active === 1
      );

      const materialsToSave = ipsrMaterials?.filter(
        ip => !existingMaterials.includes(ip.link)
      );

      let saveMaterials: Evidence[] = [];

      if (materialsToSave?.length > 0) {
        for (const entity of materialsToSave) {
          const newMaterials = new Evidence();
          newMaterials.result_id = resultId;
          newMaterials.link = entity.link;
          newMaterials.evidence_type_id = 4;
          newMaterials.version_id = version.id;
          newMaterials.created_by = user.id;
          newMaterials.creation_date = new Date();
          newMaterials.last_updated_by = user.id;
          newMaterials.last_updated_date = new Date();
          saveMaterials.push(await this._evidenceRepository.save(newMaterials));
        }
      };

      if (materialsToActive?.length > 0) {
        for (const entity of materialsToActive) {
          entity.is_active = 1;
          entity.last_updated_by = user.id;
          entity.last_updated_date = new Date();
          saveMaterials.push(await this._evidenceRepository.save(entity));
        }
      };

      if (materialsToInactive?.length > 0) {
        for (const entity of materialsToInactive) {
          entity.is_active = 0;
          entity.last_updated_by = user.id;
          entity.last_updated_date = new Date();
          saveMaterials.push(await this._evidenceRepository.save(entity));
        }
      };

      return {
        saveMaterials
      };

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveWorkshop(resultId: number, user: TokenDto, saveStepFourDto: SaveStepFour, version: Version) {
    const id: number = +resultId;
    try {
      const allEvidence: Evidence[] = await this._evidenceRepository.getWokrshop(+id);
      const existingWorkshop = allEvidence.map(e => e.link);
      const existingIds = allEvidence.map(e => e.id);

      const ipsrWorkshop: string = saveStepFourDto.link_workshop_list;

      if (ipsrWorkshop === '' || ipsrWorkshop === undefined || ipsrWorkshop === null) {
        for (const e of existingIds) {
          await this._evidenceRepository.update(e, {
            is_active: 0,
            last_updated_by: user.id,
            last_updated_date: new Date(),
          })
        }
        throw {
          message: 'Materials was not found',
          status: HttpStatus.NOT_FOUND,
        }
      }

      if (existingWorkshop?.length) {
        for (const e of existingIds) {
          await this._evidenceRepository.update(e, {
            link: ipsrWorkshop,
            last_updated_by: user.id,
            last_updated_date: new Date(),
          })
        }
      } else {
        await this._evidenceRepository.save({
          result_id: resultId,
          link: ipsrWorkshop,
          evidence_type_id: 5,
          version_id: version.id,
          created_by: user.id,
          creation_date: new Date(),
          last_updated_by: user.id,
          last_updated_date: new Date(),
        })
      }

      return {
        valid: true
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveInitiativeInvestment(resultId: number, user: TokenDto, saveStepFourDto: SaveStepFour, version: Version) {
    try {
      if (saveStepFourDto?.initiative_expected_investment?.length) {
        const {
          initiative_expected_investment: iei
        } = saveStepFourDto;

        iei.forEach(async i => {
          const ibr = await this._resultByInitiativeRepository.findOne({
            where: {
              result_id: resultId,
              is_active: true,
              initiative_id: i.initiative_id
            }
          });

          if (ibr) {
            const rie = await this._resultInitiativesBudgetRepository.findOne({
              where: {
                result_initiative_id: ibr.id,
                is_active: true
              }
            });

            if (rie) {
              await this._resultInitiativesBudgetRepository.update(rie.result_initiative_budget_id, {
                current_year: i.current_year,
                next_year: i.next_year,
                is_determined: i.is_determined,
                last_updated_by: user.id,
              });
            } else {
              await this._resultInitiativesBudgetRepository.save({
                result_initiative_id: ibr.id,
                current_year: i.current_year,
                next_year: i.next_year,
                is_determined: i.is_determined,
                version_id: version.id,
                created_by: user.id,
                last_updated_by: user.id,
              })
            }
          }
        })

        return {
          valid: true
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveBillateralInvestment(resultId: number, user: TokenDto, saveStepFourDto: SaveStepFour, version: Version) {
    try {
      if (saveStepFourDto?.bilateral_expected_investment?.length) {
        const {
          bilateral_expected_investment: bei
        } = saveStepFourDto;

        bei.forEach(async i => {
          const npp = await this._nonPooledProjectRepository.findOne({
            where: {
              results_id: resultId,
              is_active: true,
              id: i.npp_id
            }
          });

          if (npp) {
            const rbb = await this._resultBilateralBudgetRepository.findOne({
              where: {
                non_pooled_projetct_id: npp.id,
                is_active: true
              }
            });

            if (rbb) {
              await this._resultBilateralBudgetRepository.update(rbb.non_pooled_projetct_budget_id, {
                current_year: i.current_year,
                next_year: i.next_year,
                is_determined: i.is_determined,
                last_updated_by: user.id,
              });
            } else {
              await this._resultBilateralBudgetRepository.save({
                non_pooled_projetct_id: npp.id,
                current_year: i.current_year,
                next_year: i.next_year,
                is_determined: i.is_determined,
                version_id: version.id,
                created_by: user.id,
                last_updated_by: user.id,
              })
            }
          }
        })

        return {
          valid: true
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async savePartnertInvestment(resultId: number, user: TokenDto, saveStepFourDto: SaveStepFour, version: Version) {
    try {
      if (saveStepFourDto?.institutions_expected_investment?.length) {
        const {
          institutions_expected_investment: iei
        } = saveStepFourDto;

        iei.forEach(async i => {
          const rbi = await this._resultByInstitutionsRepository.getResultByInstitutionById(resultId, i.rbi_id);

          const mapId: number[] = rbi.map(r => r.id);

          if (rbi) {
            const rbb = await this._resultInstitutionsBudgetRepository.findOne({
              where: {
                result_institution_id: +mapId[0],
                is_active: true
              }
            });

            if (rbb) {
              await this._resultInstitutionsBudgetRepository.update(rbb.result_institutions_budget_id, {
                current_year: i.current_year,
                next_year: i.next_year,
                is_determined: i.is_determined,
                last_updated_by: user.id,
              });
            } else {
              await this._resultInstitutionsBudgetRepository.save({
                result_institution_id: +mapId[0],
                current_year: i.current_year,
                next_year: i.next_year,
                is_determined: i.is_determined,
                version_id: version.id,
                created_by: user.id,
                last_updated_by: user.id,
              })
            }
          }
        })

        return {
          valid: true
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
