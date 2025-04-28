import { HttpStatus, Injectable } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Version } from '../../versioning/entities/version.entity';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { IpsrRepository } from '../ipsr.repository';
import {
  donorInterfaceToc,
  InstitutionsInterface,
  SaveStepFour,
} from './dto/save-step-four.dto';
import { ResultByInitiativesRepository } from '../../../api/results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultInitiativeBudgetRepository } from 'src/api/results/result_budget/repositories/result_initiative_budget.repository';
import { ResultInitiativeBudget } from '../../../api/results/result_budget/entities/result_initiative_budget.entity';
import { In } from 'typeorm';
import { NonPooledProjectRepository } from '../../../api/results/non-pooled-projects/non-pooled-projects.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { VersioningService } from '../../versioning/versioning.service';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { Evidence } from '../../results/evidences/entities/evidence.entity';

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
    protected readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    private readonly _versioningService: VersioningService,
  ) {}

  async getStepFour(resultId: number) {
    try {
      const ipsr_pictures = await this._evidenceRepository.find({
        where: {
          result_id: resultId,
          is_active: 1,
          evidence_type_id: 3,
        },
      });

      const ipsr_materials = await this._evidenceRepository.find({
        where: {
          result_id: resultId,
          is_active: 1,
          evidence_type_id: 4,
        },
      });

      const initiatives = await this._resultByInitiativeRepository.find({
        where: {
          result_id: resultId,
          is_active: true,
        },
      });

      const initiative_expected_investment =
        await this._resultInitiativesBudgetRepository.find({
          where: {
            result_initiative_id: In(initiatives.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_result_initiative: {
              obj_initiative: true,
            },
          },
        });

      const result_ip = await this._resultInnovationPackageRepository.findOne({
        where: {
          result_innovation_package_id: resultId,
          is_active: true,
        },
      });

      const npp = await this._nonPooledProjectRepository.find({
        where: [
          {
            results_id: resultId,
            is_active: true,
            non_pooled_project_type_id: 2,
          },
        ],
      });

      const bilateral_expected_investment =
        await this._resultBilateralBudgetRepository.find({
          where: {
            non_pooled_projetct_id: In(npp.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_non_pooled_projetct: true,
          },
        });

      const institutions = await this._resultByInstitutionsRepository.find({
        where: [
          {
            result_id: resultId,
            institution_roles_id: 2,
          },
          {
            result_id: resultId,
            is_active: true,
            institution_roles_id: 7,
          },
        ],
      });

      const institutions_expected_investment =
        await this._resultInstitutionsBudgetRepository.find({
          select: {
            result_institutions_budget_id: true,
            result_institution_id: true,
            in_kind: true,
            in_cash: true,
            is_determined: true,
            is_active: true,
          },
          where: {
            result_institution_id: In(institutions.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_result_institution: {
              obj_institutions: {
                obj_institution_type_code: true,
              },
              result_institution_budget_array: true,
            },
          },
        });

      if (!result_ip) {
        return {
          response: {},
          message: 'No ipsr_pictures found',
          statusCode: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: {
          ipsr_pictures,
          ipsr_materials,
          initiative_expected_investment,
          initiative_unit_time_id: result_ip.initiative_unit_time_id,
          initiative_expected_time: result_ip.initiative_expected_time,
          bilateral_unit_time_id: result_ip.bilateral_unit_time_id,
          bilateral_expected_time: result_ip.bilateral_expected_time,
          partner_unit_time_id: result_ip.partner_unit_time_id,
          partner_expected_time: result_ip.partner_expected_time,
          bilateral_expected_investment,
          institutions_expected_investment,
          is_result_ip_published: result_ip.is_result_ip_published,
          ipsr_pdf_report: result_ip.ipsr_pdf_report,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return {
        response: error,
        message: 'Error getting step four',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async saveMain(
    resultId: number,
    user: TokenDto,
    saveStepFourDto: SaveStepFour,
  ) {
    try {
      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true,
        },
      });
      if (!result) {
        throw new Error('The result was not found');
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

      const materials = await this.saveMaterials(
        result.id,
        user,
        saveStepFourDto,
      );
      const initiativeInvestment = await this.saveInitiativeInvestment(
        result.id,
        user,
        saveStepFourDto,
      );
      const billateralInvestment = await this.saveBillateralInvestment(
        result.id,
        user,
        saveStepFourDto,
      );
      const partnertInvestment = await this.savePartnertInvestment(
        user,
        saveStepFourDto,
      );

      const investment = await this._resultInnovationPackageRepository.update(
        resultId,
        {
          initiative_unit_time_id: saveStepFourDto.initiative_unit_time_id,
          initiative_expected_time: saveStepFourDto.initiative_expected_time,
          bilateral_unit_time_id: saveStepFourDto.initiative_unit_time_id,
          bilateral_expected_time: saveStepFourDto.initiative_expected_time,
          partner_unit_time_id: saveStepFourDto.initiative_unit_time_id,
          partner_expected_time: saveStepFourDto.initiative_expected_time,
        },
      );

      return {
        response: {
          materials,
          initiativeInvestment,
          billateralInvestment,
          partnertInvestment,
          investment,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveMaterials(
    resultId: number,
    user: TokenDto,
    saveStepFourDto: SaveStepFour,
  ): Promise<any> {
    const id = +resultId;
    try {
      const allEvidence = await this._evidenceRepository.getMaterials(id);
      const ipsrMaterials = saveStepFourDto.ipsr_materials;

      if (ipsrMaterials.length === 0) {
        const deactivated = await this.deactivateAll(allEvidence, user);
        return { saveMaterial: deactivated };
      }

      const invalid = ipsrMaterials.find((m) => !m.link);
      if (invalid) {
        return {
          response: { valid: false },
          message: 'Please provide a link',
          status: HttpStatus.NOT_ACCEPTABLE,
        };
      }

      const existingLinks = allEvidence.map((e) => e.link);
      const syncPromises = this.syncExisting(allEvidence, ipsrMaterials, user);
      const createPromises = this.createNew(
        existingLinks,
        ipsrMaterials,
        user,
        id,
      );

      const saveMaterial = await Promise.all([
        ...syncPromises,
        ...createPromises,
      ]);
      return { saveMaterial };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async deactivateAll(
    allEvidence: Evidence[],
    user: TokenDto,
  ): Promise<Evidence[]> {
    const updates = allEvidence
      .filter((e) => e.is_active === 1)
      .map(async (e) => {
        e.is_active = 0;
        e.last_updated_by = user.id;
        e.last_updated_date = new Date();
        return this._evidenceRepository.save(e);
      });
    return Promise.all(updates);
  }

  private syncExisting(
    allEvidence: Evidence[],
    ipsrMaterials: { link: string }[],
    user: TokenDto,
  ): Promise<Evidence>[] {
    return allEvidence.reduce<Promise<Evidence>[]>((acc, entity) => {
      const shouldBeActive = ipsrMaterials.some(
        (ip) => ip.link === entity.link,
      );
      if (
        (shouldBeActive && entity.is_active === 0) ||
        (!shouldBeActive && entity.is_active === 1)
      ) {
        entity.is_active = shouldBeActive ? 1 : 0;
        entity.last_updated_by = user.id;
        entity.last_updated_date = new Date();
        acc.push(this._evidenceRepository.save(entity));
      }
      return acc;
    }, []);
  }

  private createNew(
    existingLinks: string[],
    ipsrMaterials: { link: string }[],
    user: TokenDto,
    resultId: number,
  ): Promise<Evidence>[] {
    return ipsrMaterials
      .filter((m) => !existingLinks.includes(m.link))
      .map((m) => {
        const newMaterial = new Evidence();
        newMaterial.result_id = resultId;
        newMaterial.link = m.link;
        newMaterial.evidence_type_id = 4;
        newMaterial.created_by = user.id;
        newMaterial.creation_date = new Date();
        newMaterial.last_updated_by = user.id;
        newMaterial.last_updated_date = new Date();
        return this._evidenceRepository.save(newMaterial);
      });
  }

  async saveInitiativeInvestment(
    resultId: number,
    user: TokenDto,
    saveStepFourDto: SaveStepFour,
  ) {
    try {
      if (saveStepFourDto?.initiative_expected_investment?.length) {
        const initiativeInvestments =
          saveStepFourDto.initiative_expected_investment;

        for (const initiative of initiativeInvestments) {
          const ibr = await this._resultByInitiativeRepository.findOne({
            where: {
              result_id: resultId,
              is_active: true,
              id: initiative.result_initiative_id,
            },
          });

          if (ibr) {
            const rie: ResultInitiativeBudget =
              await this._resultInitiativesBudgetRepository.findOne({
                where: {
                  result_initiative_id: ibr.id,
                  is_active: true,
                },
              });

            if (rie) {
              rie.current_year = initiative.current_year;
              rie.next_year = initiative.next_year;
              rie.is_determined = initiative.is_determined;
              rie.last_updated_by = user.id;

              await this._resultInitiativesBudgetRepository.save(rie);
            } else {
              const newRie = this._resultInitiativesBudgetRepository.create({
                result_initiative_id: ibr.id,
                current_year: initiative.current_year,
                next_year: initiative.next_year,
                is_determined: initiative.is_determined,
                created_by: user.id,
                last_updated_by: user.id,
              });

              await this._resultInitiativesBudgetRepository.save(newRie);
            }
          }
        }

        return {
          valid: true,
        };
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveBillateralInvestment(
    resultId: number,
    user: TokenDto,
    saveStepFourDto: SaveStepFour,
  ): Promise<any> {
    try {
      const bei = saveStepFourDto?.bilateral_expected_investment;
      if (!bei?.length) {
        return { valid: true };
      }

      for (const i of bei) {
        const npp = await this._nonPooledProjectRepository.findOne({
          where: [{ id: i.non_pooled_projetct_id }],
        });

        if (!npp) {
          return {
            data: {},
            message: 'The non-pooled project was not found',
            status: HttpStatus.NOT_FOUND,
          };
        }

        if (i.is_active === false) {
          await this._resultBilateralBudgetRepository.update(
            { non_pooled_projetct_id: npp.id, is_active: true },
            { is_active: false },
          );
          if (+npp.non_pooled_project_type_id === 2) {
            await this._nonPooledProjectRepository.update(
              { id: npp.id },
              { is_active: false },
            );
          }
          continue;
        }

        const rbb = await this._resultBilateralBudgetRepository.findOne({
          where: { non_pooled_projetct_id: npp.id, is_active: true },
        });

        const budgetData = {
          non_pooled_projetct_id: npp.id,
          in_kind: i.in_kind,
          in_cash: i.in_cash,
          is_determined: i.is_determined,
          last_updated_by: user.id,
        };

        if (rbb) {
          await this._resultBilateralBudgetRepository.update(
            {
              non_pooled_projetct_budget_id: rbb.non_pooled_projetct_budget_id,
            },
            budgetData,
          );
        } else {
          await this._resultBilateralBudgetRepository.save({
            ...budgetData,
            created_by: user.id,
          });
        }
      }

      return { valid: true };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async savePartnertInvestment(
    user: TokenDto,
    saveStepFourDto: SaveStepFour,
  ): Promise<any> {
    try {
      const iei = saveStepFourDto?.institutions_expected_investment;
      if (!iei?.length) {
        return { valid: true };
      }

      for (const i of iei) {
        const institution = await this._resultByInstitutionsRepository.findOne({
          where: [{ id: i.obj_result_institution.id }],
        });

        if (!institution) {
          return {
            data: {},
            message: 'The institution was not found',
            status: HttpStatus.NOT_FOUND,
          };
        }

        const role = +institution.institution_roles_id;
        if (i.is_active === false) {
          await this._resultInstitutionsBudgetRepository.update(
            { result_institution_id: institution.id, is_active: true },
            { is_active: false },
          );
          if (role === 7) {
            await this._resultByInstitutionsRepository.update(
              { id: institution.id },
              { is_active: false },
            );
          }
          continue;
        }

        const budgetData = {
          result_institution_id: institution.id,
          in_kind: i.in_kind,
          in_cash: i.in_cash,
          is_determined: i.is_determined,
          last_updated_by: user.id,
        };
        const rib = await this._resultInstitutionsBudgetRepository.findOne({
          where: { result_institution_id: institution.id, is_active: true },
        });

        if (rib) {
          await this._resultInstitutionsBudgetRepository.update(
            {
              result_institutions_budget_id: rib.result_institutions_budget_id,
            },
            budgetData,
          );
        } else {
          await this._resultInstitutionsBudgetRepository.save({
            ...budgetData,
            created_by: user.id,
          });
        }
      }

      return { valid: true };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async savePartners(
    resultId: number,
    user: TokenDto,
    crtr: InstitutionsInterface,
  ) {
    try {
      let institutions_expected_investment: any;
      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.IPSR,
      );
      if (!version) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }

      if (crtr) {
        const instExist = await this._resultByInstitutionsRepository.findOne({
          where: {
            institutions_id: crtr.institutions_id,
            institution_roles_id: 7,
            result_id: resultId,
          },
        });
        let rbi: ResultsByInstitution = null;
        if (instExist) {
          await this._resultByInstitutionsRepository.update(instExist.id, {
            is_active: true,
          });
          return {
            message: 'The institution already exists',
            status: HttpStatus.NOT_ACCEPTABLE,
          };
        } else {
          rbi = await this._resultByInstitutionsRepository.save({
            institution_roles_id: 7,
            institutions_id: crtr.institutions_id,
            result_id: resultId,
            created_by: user.id,
            last_updated_by: user.id,
          });

          await this._resultInstitutionsBudgetRepository.save({
            result_institution_id: rbi.id,
            created_by: user.id,
            last_updated_by: user.id,
          });

          const institutions = await this._resultByInstitutionsRepository.find({
            where: { id: rbi.id, institution_roles_id: 7 },
            relations: {
              obj_institutions: { obj_institution_type_code: true },
            },
          });

          institutions_expected_investment =
            await this._resultInstitutionsBudgetRepository.findOne({
              select: {
                result_institutions_budget_id: true,
                result_institution_id: true,
                in_kind: true,
                in_cash: true,
                is_determined: true,
                is_active: true,
              },
              where: {
                result_institution_id: In(institutions.map((el) => el.id)),
                is_active: true,
              },
              relations: {
                obj_result_institution: {
                  obj_institutions: {
                    obj_institution_type_code: true,
                  },
                  result_institution_budget_array: true,
                },
              },
            });
        }
        const delData = crtr?.deliveries?.length ? crtr?.deliveries : [];
        await this.saveDeliveries(instExist || rbi, delData, user.id, version);
      }

      return {
        response: institutions_expected_investment,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveBilaterals(
    resultId: number,
    user: TokenDto,
    bltl: donorInterfaceToc,
  ) {
    try {
      let bilateral_expected_investment: any;
      let newNpp: any;
      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.IPSR,
      );
      if (!version) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }
      if (bltl) {
        const nppEx = await this._nonPooledProjectRepository.findOne({
          where: {
            grant_title: bltl.grant_title,
            non_pooled_project_type_id: 2,
            results_id: resultId,
          },
        });

        if (nppEx) {
          await this._nonPooledProjectRepository.update(nppEx.id, {
            is_active: true,
            center_grant_id: bltl.center_grant_id,
            funder_institution_id: bltl.funder,
            lead_center_id: bltl.lead_center,
            last_updated_by: user.id,
            grant_title: bltl.grant_title,
          });
        } else {
          newNpp = await this._nonPooledProjectRepository.save({
            results_id: resultId,
            center_grant_id: bltl.center_grant_id,
            grant_title: bltl.grant_title,
            funder_institution_id: bltl.funder,
            lead_center_id: bltl.lead_center,
            created_by: user.id,
            last_updated_by: user.id,
            non_pooled_project_type_id: 2,
          });

          await this._resultBilateralBudgetRepository.save({
            non_pooled_projetct_id: newNpp?.id,
            created_by: user.id,
            last_updated_by: user.id,
          });

          bilateral_expected_investment =
            await this._resultBilateralBudgetRepository.find({
              where: {
                non_pooled_projetct_id: newNpp?.id,
                is_active: true,
              },
              relations: {
                obj_non_pooled_projetct: true,
              },
            });
        }
      }
      return {
        response: bilateral_expected_investment[0],
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  protected async saveDeliveries(
    inst: InstitutionsInterface,
    deliveries: number[],
    userId: number,
    v: Version,
  ) {
    await this._resultByInstitutionsByDeliveriesTypeRepository.inactiveResultDeLivery(
      inst.id,
      deliveries,
      userId,
    );
    for (const deli of deliveries) {
      const deliExist =
        await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByTypeAndResultByInstitution(
          inst.id,
          deli,
        );
      if (!deliExist) {
        await this._resultByInstitutionsByDeliveriesTypeRepository.save({
          partner_delivery_type_id: deli,
          result_by_institution_id: inst.id,
          last_updated_by: userId,
          created_by: userId,
          versions_id: v.id,
        });
      }
    }
  }
}
