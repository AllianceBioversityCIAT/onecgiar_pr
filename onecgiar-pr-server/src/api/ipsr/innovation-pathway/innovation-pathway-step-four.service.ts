import { HttpStatus, Injectable, Type } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError, returnErrorDto } from '../../../shared/handlers/error.utils';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Version } from '../../results/versions/entities/version.entity';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { IpsrRepository } from '../ipsr.repository';
import { donorInterfaceToc, institutionsInterface, SaveStepFour } from './dto/save-step-four.dto';
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
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { NonPooledProject } from '../../results/non-pooled-projects/entities/non-pooled-project.entity';
import { ResultByInstitutionsByDeliveriesType } from '../../results/result-by-institutions-by-deliveries-type/entities/result-by-institutions-by-deliveries-type.entity';
import { ResultInstitutionsBudget } from '../../results/result_budget/entities/result_institutions_budget.entity';

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
    protected readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository
  ) { }

  async getStepFour(resultId: number) {
    try {
      const ipsr_pictures = await this._evidenceRepository.find({
        where: {
          result_id: resultId,
          is_active: 1,
          evidence_type_id: 3
        }
      });

      const ipsr_materials = await this._evidenceRepository.find({
        where: {
          result_id: resultId,
          is_active: 1,
          evidence_type_id: 4
        }
      });

      const link_workshop_list = await this._evidenceRepository.findOne({
        where: {
          result_id: resultId,
          is_active: 1,
          evidence_type_id: 5
        }
      });

      const initiatives = await this._resultByInitiativeRepository.find({
        where: {
          result_id: resultId,
          is_active: true
        }
      });

      const initiative_expected_investment = await this._resultInitiativesBudgetRepository.find({
        where: {
          result_initiative_id: In(initiatives.map(el => el.id)),
          is_active: true
        },
        relations: {
          obj_result_initiative: {
            obj_initiative: true
          }
        }
      });

      const result_ip = await this._resultInnovationPackageRepository.findOne({
        where: {
          result_innovation_package_id: resultId,
          is_active: true
        }
      });

      const npp = await this._nonPooledProjectRepository.find({
        where: {
          results_id: resultId,
          is_active: true,
          non_pooled_project_type_id: 2
        }
      })

      const bilateral_expected_investment = await this._resultBilateralBudgetRepository.find({
        where: {
          non_pooled_projetct_id: In(npp.map(el => el.id)),
          is_active: true
        },
        relations: {
          obj_non_pooled_projetct: true
        }
      });

      const institutions: ResultsByInstitution[] = await this._resultByInstitutionsRepository.getGenericAllResultByInstitutionByRole(resultId, 7);
      const deliveries: ResultByInstitutionsByDeliveriesType[] = await await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByResultByInstitution(institutions?.map(el => el.id));
      institutions?.map(int => {
        int['deliveries'] = deliveries?.filter(del => del.result_by_institution_id == int.id).map(del => del.partner_delivery_type_id);
      });

      const intitutins_budget = await this._resultInstitutionsBudgetRepository.find({
        where: {
          result_institution_id: In(institutions.map(el => el.id)),
          is_active: true
        }
      });

      const institutions_expected_investment = institutions.map(el => {
        return {
          institution: el,
          budget: intitutins_budget.filter(b => b.result_institution_id == el.id)
        }
      })

      return {
        response: {
          ipsr_pictures,
          ipsr_materials,
          link_workshop_list: link_workshop_list?.link,
          initiative_expected_investment,
          initiative_unit_time_id: result_ip.initiative_unit_time_id,
          initiative_expected_time: result_ip.initiative_expected_time,
          bilateral_unit_time_id: result_ip.obj_bilateral_unit_time_id,
          bilateral_expected_time: result_ip.bilateral_expected_time,
          partner_unit_time_id: result_ip.partner_unit_time_id,
          partner_expected_time: result_ip.partner_expected_time,
          bilateral_expected_investment,
          institutions_expected_investment
        },
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
      const partnertInvestment = await this.savePartnertInvestment(user, saveStepFourDto, version);

      const investment = await this._resultInnovationPackageRepository.update(resultId, {
        initiative_unit_time_id: saveStepFourDto.initiative_unit_time_id,
        initiative_expected_time: saveStepFourDto.initiative_expected_time,
        bilateral_unit_time_id: saveStepFourDto.bilateral_unit_time_id,
        bilateral_expected_time: saveStepFourDto.bilateral_expected_time,
        partner_unit_time_id: saveStepFourDto.partner_unit_time_id,
        partner_expected_time: saveStepFourDto.partner_expected_time,
        is_result_ip_published: saveStepFourDto.is_result_ip_published
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
    const id = +resultId;
    try {
      const allEvidence = await this._evidenceRepository.getPictures(id);
      const existingPictures = allEvidence.map(e => e.link);
      const existingIds = allEvidence.map(e => e.id);
      const ipsrPictures = saveStepFourDto.ipsr_pictures;
      if (!ipsrPictures.length) {
        for (const e of existingIds) {
          await this._evidenceRepository.update(e, {
            is_active: 0,
            last_updated_by: user.id,
            last_updated_date: new Date(),
          })
        }
      }

      const savePictures = [];

      for (const entity of allEvidence) {
        if (ipsrPictures.find(ip => ip.link === entity.link)) {
          if (entity.is_active === 0) {
            entity.is_active = 1;
            entity.last_updated_by = user.id;
            entity.last_updated_date = new Date();
            savePictures.push(await this._evidenceRepository.save(entity));
          }
        } else {
          if (entity.is_active === 1) {
            entity.is_active = 0;
            entity.last_updated_by = user.id;
            entity.last_updated_date = new Date();
            savePictures.push(await this._evidenceRepository.save(entity));
          }
        }
      }

      for (const entity of ipsrPictures) {
        const link = entity.link;
        if (!link) {
          return {
            response: { valid: false },
            message: 'Please provide a link',
            status: HttpStatus.NOT_ACCEPTABLE,
          }
        }

        if (!existingPictures.includes(entity.link)) {
          const newPictures = new Evidence();
          newPictures.result_id = resultId;
          newPictures.link = entity.link;
          newPictures.evidence_type_id = 3;
          newPictures.version_id = version.id;
          newPictures.created_by = user.id;
          newPictures.creation_date = new Date();
          newPictures.last_updated_by = user.id;
          newPictures.last_updated_date = new Date();
          savePictures.push(await this._evidenceRepository.save(newPictures));
        }
      }

      return { savePictures };

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveMaterials(resultId: number, user: TokenDto, saveStepFourDto: SaveStepFour, version: Version) {
    const id = +resultId;
    try {
      const allEvidence = await this._evidenceRepository.getMaterials(id);
      const existingMaterials = allEvidence.map(e => e.link);
      const existingIds = allEvidence.map(e => e.id);
      const ipsrMaterials = saveStepFourDto.ipsr_materials;
      if (!ipsrMaterials.length) {
        for (const e of existingIds) {
          await this._evidenceRepository.update(e, {
            is_active: 0,
            last_updated_by: user.id,
            last_updated_date: new Date(),
          })
        }
      }

      const saveMaterial = [];

      for (const entity of allEvidence) {
        if (ipsrMaterials.find(ip => ip.link === entity.link)) {
          if (entity.is_active === 0) {
            entity.is_active = 1;
            entity.last_updated_by = user.id;
            entity.last_updated_date = new Date();
            saveMaterial.push(await this._evidenceRepository.save(entity));
          }
        } else {
          if (entity.is_active === 1) {
            entity.is_active = 0;
            entity.last_updated_by = user.id;
            entity.last_updated_date = new Date();
            saveMaterial.push(await this._evidenceRepository.save(entity));
          }
        }
      }

      for (const entity of ipsrMaterials) {
        const link = entity.link;
        if (!link) {
          return {
            response: { valid: false },
            message: 'Please provide a link',
            status: HttpStatus.NOT_ACCEPTABLE,
          }
        }

        if (!existingMaterials.includes(entity.link)) {
          const newMaterials = new Evidence();
          newMaterials.result_id = resultId;
          newMaterials.link = entity.link;
          newMaterials.evidence_type_id = 4;
          newMaterials.version_id = version.id;
          newMaterials.created_by = user.id;
          newMaterials.creation_date = new Date();
          newMaterials.last_updated_by = user.id;
          newMaterials.last_updated_date = new Date();
          saveMaterial.push(await this._evidenceRepository.save(newMaterials));
        }
      }

      return { saveMaterial };

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
          message: 'Workshop was not found',
          status: HttpStatus.NOT_FOUND,
        }
      }

      if (existingWorkshop?.length) {
        for (const e of existingIds) {
          await this._evidenceRepository.update(e, {
            link: ipsrWorkshop,
            is_active: 1,
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
                in_kind: i.current_year,
                in_cash: i.next_year,
                is_determined: i.is_determined,
                last_updated_by: user.id,
              });
            } else {
              await this._resultBilateralBudgetRepository.save({
                non_pooled_projetct_id: npp.id,
                in_kind: i.current_year,
                in_cash: i.next_year,
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

  async savePartnertInvestment(user: TokenDto, saveStepFourDto: SaveStepFour, version: Version) {
    try {
      if (saveStepFourDto?.institutions_expected_investment?.length) {
        const { institutions_expected_investment: iei } = saveStepFourDto;

        iei.forEach(async (el) => {
          if (!el?.institution?.is_active) {
            await this._resultByInstitutionsRepository.update(el.institution.id, { is_active: false });
            await this._resultInstitutionsBudgetRepository.update({ result_institution_id: el?.institution?.id }, { is_active: false });
          } else {
            const { budget } = el;
            budget.map(async i => {
              await this.saveDeliveries(el.institution, el.institution.deliveries, user.id, version);
              let existBud: ResultInstitutionsBudget = null;
              if (i?.result_institutions_budget_id) {
                existBud = await this._resultInstitutionsBudgetRepository.findOne({ where: { result_institutions_budget_id: i?.result_institutions_budget_id } });
              } else if (!existBud) {
                existBud = await this._resultInstitutionsBudgetRepository.findOne({ where: { result_institution_id: el.institution.id } });
              }

              if (existBud) {
                await this._resultInstitutionsBudgetRepository.update(
                  i?.result_institutions_budget_id,
                  {
                    last_updated_by: user?.id,
                    is_determined: i?.is_determined,
                    in_kind: i?.in_kind,
                    in_cash: i?.in_cash
                  }
                )
              } else {
                await this._resultInstitutionsBudgetRepository.save({
                  result_institution_id: el.institution.id,
                  last_updated_by: user?.id,
                  is_determined: i?.is_determined,
                  in_kind: i?.in_kind,
                  in_cash: i?.in_cash,
                  version_id: version.id,
                  created_by: user.id,
                })

              }
            })
          }
        });
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async savePartners(resultId: number, user: TokenDto, crtr: institutionsInterface) {
    try {
      let institutions_expected_investment: any;
      const vTemp = await this._versionsService.findBaseVersion();
      if (vTemp.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: vTemp });
      }
      const version: Version = <Version>vTemp.response;
      if (crtr) {
        const instExist = await this._resultByInstitutionsRepository.findOne({ where: { institutions_id: crtr.institutions_id, institution_roles_id: 7, result_id: resultId } });
        let rbi: ResultsByInstitution = null;
        if (instExist) {
          await this._resultByInstitutionsRepository.update(
            instExist.id,
            {
              is_active: true
            }
          );
          return {
            message: 'The institution already exists',
            status: HttpStatus.NOT_ACCEPTABLE
          }
        } else {
          rbi = await this._resultByInstitutionsRepository.save({
            institution_roles_id: 7,
            institutions_id: crtr.institutions_id,
            result_id: resultId,
            version_id: version.id,
            created_by: user.id,
            last_updated_by: user.id
          });

          const newIbe = await this._resultInstitutionsBudgetRepository.save(
            {
              result_institution_id: rbi.id,
              version_id: version.id,
              created_by: user.id,
              last_updated_by: user.id
            }
          )

          const institutions = await this._resultByInstitutionsRepository.find({ where: { id: rbi.id, institution_roles_id: 7 } });
          const deliveries = await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByResultByInstitution(institutions?.map(el => el.id));
          institutions?.map(int => {
            int['deliveries'] = deliveries?.filter(del => del.result_by_institution_id == int.id).map(del => del.partner_delivery_type_id);
          });


          const intitutins_budget = await this._resultInstitutionsBudgetRepository.find({
            where: {
              result_institution_id: In(institutions.map(el => el.id)),
              is_active: true
            }
          });

          institutions_expected_investment = institutions.map(el => {
            return {
              institution: el,
              budget: intitutins_budget.filter(b => b.result_institution_id == el.id)
            }
          })
        }
        const delData = crtr?.deliveries?.length ? crtr?.deliveries : [];
        await this.saveDeliveries(instExist ? instExist : rbi, delData, user.id, version);

      }
      return {
        response: institutions_expected_investment[0],
        message: 'Successful response',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveBilaterals(resultId: number, user: TokenDto, bltl: donorInterfaceToc) {
    try {
      let bilateral_expected_investment: any;
      let newBie: any;
      let newNpp: any;
      const vTemp = await this._versionsService.findBaseVersion();
      if (vTemp.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: vTemp });
      }
      const version: Version = <Version>vTemp.response;
      if (bltl) {
        const nppEx = await this._nonPooledProjectRepository.findOne({
          where: {
            grant_title: bltl.grant_title,
            non_pooled_project_type_id: 2,
            results_id: resultId
          }
        });

        if (nppEx) {
          await this._nonPooledProjectRepository.update(
            nppEx.id,
            {
              is_active: true,
              center_grant_id: bltl.center_grant_id,
              funder_institution_id: bltl.funder,
              lead_center_id: bltl.lead_center,
              last_updated_by: user.id,
              grant_title: bltl.grant_title
            }
          );
        } else {
          newNpp = await this._nonPooledProjectRepository.save({
            results_id: resultId,
            center_grant_id: bltl.center_grant_id,
            grant_title: bltl.grant_title,
            funder_institution_id: bltl.funder,
            lead_center_id: bltl.lead_center,
            version_id: version.id,
            created_by: user.id,
            last_updated_by: user.id,
            non_pooled_project_type_id: 2
          })

          const newBie = await this._resultBilateralBudgetRepository.save({
            non_pooled_projetct_id: newNpp?.id,
            version_id: version.id,
            created_by: user.id,
            last_updated_by: user.id,
          })

          bilateral_expected_investment = await this._resultBilateralBudgetRepository.find({
            where: {
              non_pooled_projetct_id: newNpp?.id,
              is_active: true
            },
            relations: {
              obj_non_pooled_projetct: true
            }
          });
        }
      }
      return {
        response: bilateral_expected_investment[0],
        message: 'Successful response',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  protected async saveDeliveries(inst: institutionsInterface, deliveries: number[], userId: number, v: Version) {
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
