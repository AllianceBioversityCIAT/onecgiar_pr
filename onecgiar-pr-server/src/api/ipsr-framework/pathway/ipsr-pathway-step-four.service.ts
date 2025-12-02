import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { IpsrSaveStepFour } from './dto/ipsr-save-steo-four.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultRepository } from '../../results/result.repository';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultInnovationPackageRepository } from '../../ipsr/result-innovation-package/repositories/result-innovation-package.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultInitiativeBudgetRepository } from '../../results/result_budget/repositories/result_initiative_budget.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { Evidence } from '../../results/evidences/entities/evidence.entity';
import { ResultInitiativeBudget } from '../../results/result_budget/entities/result_initiative_budget.entity';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultInstitutionsBudget } from '../../results/result_budget/entities/result_institutions_budget.entity';
import { ResultScalingStudyUrl } from '../../results-framework-reporting/result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { In, Repository } from 'typeorm';
import { NonPooledProjectRepository } from '../../results/non-pooled-projects/non-pooled-projects.repository';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class IpsrPathwayStepFourService {
  private readonly logger = new Logger(IpsrPathwayStepFourService.name);
  constructor(
    protected readonly _handlersError: HandlersError,
    protected readonly _resultRepository: ResultRepository,
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    @InjectRepository(ResultScalingStudyUrl)
    private readonly _resultScalingStudyUrlsRepository: Repository<ResultScalingStudyUrl>,
    protected readonly _evidenceRepository: EvidencesRepository,
    protected readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    protected readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    protected readonly _resultByProjectRepository: ResultsByProjectsRepository,
    protected readonly _resultInitiativesBudgetRepository: ResultInitiativeBudgetRepository,
    protected readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    protected readonly _resultByInstitutionsRepository: ResultByIntitutionsRepository,
    protected readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _versioningService: VersioningService,
  ) {}

  async saveMain(
    resultId: number,
    user: TokenDto,
    saveStepFourDto: IpsrSaveStepFour,
  ) {
    try {
      console.log('saveStepFourDto', saveStepFourDto);
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
        user.id,
        saveStepFourDto,
      );
      const billateralInvestment = await this.saveBillateralInvestment(
        result.id,
        user.id,
        saveStepFourDto,
      );
      const partnerInvestment = await this.savePartnerInvestment(
        result.id,
        user.id,
        saveStepFourDto,
      );

      await this.syncScalingStudyUrls(
        result.id,
        saveStepFourDto.scaling_studies_urls,
        user.id,
      );

      if (!saveStepFourDto.has_scaling_studies) {
        await this._resultScalingStudyUrlsRepository.update(
          { result_innov_package_id: result.id },
          { is_active: false },
        );
      }

      const investment = await this._resultInnovationPackageRepository.update(
        resultId,
        {
          has_scaling_studies: saveStepFourDto.has_scaling_studies,
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
          partnerInvestment,
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
    saveStepFourDto: IpsrSaveStepFour,
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

  private async syncScalingStudyUrls(
    resulId: number,
    scalingStudiesUrls: string[],
    userId: number,
  ): Promise<void> {
    const existingUrls = await this._resultScalingStudyUrlsRepository.find({
      where: { result_innov_package_id: resulId, is_active: true },
    });

    const existingUrlStrings = existingUrls.map((el) => el.study_url.trim());
    const incomingUrls = scalingStudiesUrls.map((url) => url.trim());

    const urlsToCreate = incomingUrls.filter(
      (url) => !existingUrlStrings.includes(url),
    );

    const urlsToDeactivate = existingUrls.filter(
      (el) => !incomingUrls.includes(el.study_url.trim()),
    );

    if (urlsToCreate.length > 0) {
      const newUrls = urlsToCreate.map((url) => ({
        result_innov_package_id: resulId,
        study_url: url,
        is_active: true,
        created_by: userId,
      }));

      await this._resultScalingStudyUrlsRepository.save(newUrls);
    }

    if (urlsToDeactivate.length > 0) {
      const idsToDeactivate = urlsToDeactivate.map((el) => el.id);

      await this._resultScalingStudyUrlsRepository.update(
        { id: In(idsToDeactivate) },
        { is_active: false, last_updated_by: userId },
      );
    }
  }

  async savePartnerInvestment(
    resultId: number,
    user: number,
    { institutions_expected_investment: inv }: IpsrSaveStepFour,
  ) {
    try {
      if (!inv || !Array.isArray(inv) || inv.length === 0) {
        this.logger.log(
          '[savePartnerInvestment] No investment_partners provided. Continuing flow.',
        );
        return { valid: true };
      }

      for (const partner of inv) {
        const rbi = await this._resultByInstitutionsRepository.findOne({
          where: {
            result_id: resultId,
            institutions_id: partner.result_institution_id,
          },
        });

        if (!rbi) {
          this.logger.error(
            `[savePartnerInvestment] Institution relation not found for resultId: ${resultId}, institutionId: ${partner.result_institution_id}`,
          );
          throw {
            response: {},
            message: `Partner relation not found for resultId: ${resultId}, partnerId: ${partner.result_institution_id}`,
            status: HttpStatus.NOT_FOUND,
          };
        }

        const existBud: ResultInstitutionsBudget =
          await this._resultInstitutionsBudgetRepository.findOne({
            where: {
              result_institution_id: rbi.id,
              is_active: true,
            },
          });

        if (existBud) {
          existBud.kind_cash =
            partner.kind_cash === null ? null : Number(partner.kind_cash);
          existBud.is_determined = partner.is_determined;
          existBud.last_updated_by = user;

          await this._resultInstitutionsBudgetRepository.save(existBud);
        } else {
          const newBud = this._resultInstitutionsBudgetRepository.create({
            result_institution_id: rbi.id,
            kind_cash:
              partner.kind_cash === null ? null : Number(partner.kind_cash),
            is_determined: partner.is_determined,
            created_by: user,
            last_updated_by: user,
          });

          await this._resultInstitutionsBudgetRepository.save(newBud);
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveBillateralInvestment(
    resultId: number,
    user: number,
    { bilateral_expected_investment: inv }: IpsrSaveStepFour,
  ) {
    try {
      if (!inv || !Array.isArray(inv) || inv.length === 0) {
        this.logger.log(
          `[saveBillateralInvestment] No investment_bilateral provided for resultId: ${resultId}. Continuing flow.`,
        );
        return { valid: true };
      }

      for (const i of inv) {
        const rbp = await this._resultByProjectRepository.findOne({
          where: {
            result_id: resultId,
            is_active: true,
            project_id: i.result_project_id,
          },
        });

        if (!rbp) {
          this.logger.error(
            `[saveBillateralInvestment] ResultByProject not found for resultId: ${resultId}, project_id: ${i.result_project_id}`,
          );
          throw {
            response: {},
            message: `ResultByProject not found for resultId: ${resultId}, project_id: ${i.result_project_id}`,
            status: HttpStatus.NOT_FOUND,
          };
        }

        const rbb = await this._resultBilateralBudgetRepository.findOne({
          where: {
            result_project_id: rbp.id,
            is_active: true,
          },
        });

        if (rbb) {
          rbb.kind_cash =
            i.is_determined === true
              ? null
              : i.kind_cash === null
                ? null
                : Number(i.kind_cash);
          rbb.is_determined = i.is_determined;
          rbb.last_updated_by = user;
          rbb.non_pooled_projetct_id = null;

          await this._resultBilateralBudgetRepository.save(rbb);
        } else {
          const newRbb = this._resultBilateralBudgetRepository.create({
            result_project_id: rbp.id,
            non_pooled_projetct_id: null,
            kind_cash:
              i.is_determined === true
                ? null
                : i.kind_cash === null
                  ? null
                  : Number(i.kind_cash),
            is_determined: i.is_determined,
            created_by: user,
            last_updated_by: user,
          });

          await this._resultBilateralBudgetRepository.save(newRbb);
        }
      }
      return { valid: true };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveInitiativeInvestment(
    resultId: number,
    user: number,
    { initiative_expected_investment: inv }: IpsrSaveStepFour,
  ) {
    try {
      if (!inv || !Array.isArray(inv) || inv.length === 0) {
        this.logger.log(
          `[saveInitiativeInvestment] No investment_programs provided for resultId: ${resultId}. Continuing flow.`,
        );
        return { valid: true };
      }

      for (const initiative of inv) {
        const ibr = await this._resultByInitiativeRepository.findOne({
          where: {
            result_id: resultId,
            initiative_id: initiative.result_initiative_id,
            is_active: true,
          },
        });

        if (!ibr) {
          this.logger.error(
            `[saveInitiativeInvestment] Initiative relation not found for resultId: ${resultId}, initiativeId: ${initiative.result_initiative_id}`,
          );
          throw {
            response: {},
            message: `Initiative relation not found for resultId: ${resultId}, initiativeId: ${initiative.result_initiative_id}`,
            status: HttpStatus.NOT_FOUND,
          };
        }

        const rie: ResultInitiativeBudget =
          await this._resultInitiativesBudgetRepository.findOne({
            where: {
              result_initiative_id: ibr.id,
              is_active: true,
            },
          });

        if (rie) {
          rie.kind_cash =
            initiative.is_determined === true
              ? null
              : initiative.kind_cash === null
                ? null
                : Number(initiative.kind_cash);

          rie.is_determined = initiative.is_determined;
          rie.last_updated_by = user;

          await this._resultInitiativesBudgetRepository.save(rie);
        } else {
          const newRie = this._resultInitiativesBudgetRepository.create({
            result_initiative_id: ibr.id,
            kind_cash:
              initiative.is_determined === true
                ? null
                : initiative.kind_cash === null
                  ? null
                  : Number(initiative.kind_cash),
            is_determined: initiative.is_determined,
            created_by: user,
            last_updated_by: user,
          });

          await this._resultInitiativesBudgetRepository.save(newRie);
        }
      }
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

      const rbp = await this._resultByProjectRepository.find({
        where: {
          result_id: resultId,
          is_active: true,
        },
      });

      const bilateral_expected_investment =
        await this._resultBilateralBudgetRepository.find({
          where: {
            result_project_id: In(rbp.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_result_project: {
              obj_clarisa_project: true,
            },
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
            kind_cash: true,
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
}
