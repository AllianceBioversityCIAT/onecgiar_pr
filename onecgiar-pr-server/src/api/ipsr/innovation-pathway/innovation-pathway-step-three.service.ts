import { HttpStatus, Injectable } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import {
  HandlersError,
  ReturnResponse,
  ReturnResponseDto,
} from '../../../shared/handlers/error.utils';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsComplementaryInnovationRepository } from '../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import {
  IpsrPrincipalImpactArea,
  IpsrStepThreeComponent,
  IpsrStepThreeEvidence,
  SaveStepTwoThree,
} from './dto/save-step-three.dto';
import { ResultsByIpInnovationUseMeasureRepository } from '../results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpActorRepository } from '../results-ip-actors/results-ip-actor.repository';
import { ResultsIpInstitutionTypeRepository } from '../results-ip-institution-type/results-ip-institution-type.repository';
import { ResultsIpActor } from '../results-ip-actors/entities/results-ip-actor.entity';
import { ResultsByIpInnovationUseMeasure } from '../results-by-ip-innovation-use-measures/entities/results-by-ip-innovation-use-measure.entity';
import { IpsrRepository } from '../ipsr.repository';
import { IsNull } from 'typeorm';
import { ResultsIpInstitutionType } from '../results-ip-institution-type/entities/results-ip-institution-type.entity';
import { Evidence } from '../../results/evidences/entities/evidence.entity';
import { Ipsr } from '../entities/ipsr.entity';
import { ResultIpExpertWorkshopOrganizedRepostory } from './repository/result-ip-expert-workshop-organized.repository';
import { ResultIpExpertWorkshopOrganized } from './entities/result-ip-expert-workshop-organized.entity';
import { VersioningService } from '../../versioning/versioning.service';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { UpdateInnovationPathwayDto } from './dto/update-innovation-pathway.dto';
import { EvidencesService } from '../../results/evidences/evidences.service';
import { EvidencesCreateInterface } from '../../results/evidences/dto/create-evidence.dto';
import {
  IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT,
  IpsrEvidenceLevelEnum,
} from '../../../shared/constants/evidence-type.enum';
import { EvidenceWithEvidenceSharepoint } from '../../results/evidences/interfaces/evidence-with-evidence-sharepoint.interface';
import { Result } from '../../results/entities/result.entity';

/**
 * P2-3824 — the two Step 3 evidence lists of a component and the legacy single-link columns each
 * one is dual-written to (the green checks, the bilateral payload and phase replication still
 * read those columns).
 */
const STEP_THREE_EVIDENCE_LEVELS = [
  {
    level: IpsrEvidenceLevelEnum.READINESS,
    listKey: 'readiness_evidences',
    linkColumn: 'readinees_evidence_link',
    detailsColumn: 'readiness_details_of_evidence',
  },
  {
    level: IpsrEvidenceLevelEnum.USE,
    listKey: 'use_evidences',
    linkColumn: 'use_evidence_link',
    detailsColumn: 'use_details_of_evidence',
  },
] as const;

/** P2-3824 — `gender_tag_level.id = 3` is the (2) Principal score. */
const PRINCIPAL_TAG_LEVEL_ID = 3;

const PRINCIPAL_IMPACT_AREA_COLUMNS: ReadonlyArray<
  readonly [keyof Result, IpsrPrincipalImpactArea]
> = [
  ['gender_tag_level_id', 'gender'],
  ['climate_change_tag_level_id', 'climate'],
  ['nutrition_tag_level_id', 'nutrition'],
  ['environmental_biodiversity_tag_level_id', 'environment'],
  ['poverty_tag_level_id', 'poverty'],
];

@Injectable()
export class InnovationPathwayStepThreeService {
  constructor(
    protected readonly _versionsService: VersionsService,
    protected readonly _handlersError: HandlersError,
    protected readonly _resultRepository: ResultRepository,
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    protected readonly _innovationByResultRepository: IpsrRepository,
    protected readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    protected readonly _resultIpSdgsTargetsRepository: ResultIpSdgTargetRepository,
    protected readonly _resultComplementaryInnovation: ResultsComplementaryInnovationRepository,
    protected readonly _resultsByIpInnovationUseMeasureRepository: ResultsByIpInnovationUseMeasureRepository,
    protected readonly _resultsIpActorRepository: ResultsIpActorRepository,
    protected readonly _resultsIpInstitutionTypeRepository: ResultsIpInstitutionTypeRepository,
    protected readonly _evidenceRepository: EvidencesRepository,
    protected readonly _resultIpExpertWorkshopRepository: ResultIpExpertWorkshopOrganizedRepostory,
    protected readonly _returnResponse: ReturnResponse,
    protected readonly _versioningService: VersioningService,
    protected readonly _evidencesService: EvidencesService,
  ) {}

  async saveComplementaryinnovation(
    resultId: number,
    user: TokenDto,
    saveData: SaveStepTwoThree,
  ): Promise<ReturnResponseDto<any>> {
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

      const {
        result_innovation_package: result_ip,
        result_ip_result_core: result_ip_core,
        result_ip_result_complementary: result_ip_complementary,
      } = saveData;

      // P2-3824: refuse an invalid evidence list before anything of the step is written.
      await this._assertStepThreeEvidences(resultId, [
        result_ip_core,
        ...(result_ip_complementary ?? []),
      ]);
      const evidenceFailures: string[] = [];

      await this._resultInnovationPackageRepository.update(
        result_ip.result_innovation_package_id,
        {
          is_expert_workshop_organized: result_ip.is_expert_workshop_organized,
          readiness_level_evidence_based:
            result_ip.readiness_level_evidence_based,
          use_level_evidence_based: result_ip.use_level_evidence_based,
          assessed_during_expert_workshop_id:
            result_ip?.is_expert_workshop_organized
              ? result_ip.assessed_during_expert_workshop_id
              : null,
          last_updated_by: user.id,
        },
      );

      await this.saveinnovationWorkshop(
        user,
        result_ip_core,
        result_ip.assessed_during_expert_workshop_id,
      );
      evidenceFailures.push(
        ...(await this._saveStepThreeEvidences(resultId, result_ip_core, user)),
      );
      await this.saveInnovationUse(user, saveData);

      if (result_ip_complementary?.length) {
        for (const ripc of result_ip_complementary) {
          await this.saveinnovationWorkshop(
            user,
            ripc,
            result_ip.assessed_during_expert_workshop_id,
          );
          evidenceFailures.push(
            ...(await this._saveStepThreeEvidences(resultId, ripc, user)),
          );
        }
      }

      // Everything that could be saved IS saved by now; only then say what could not.
      if (evidenceFailures.length) {
        this._rejectStepThree(
          evidenceFailures.length === 1
            ? `The rest of the step was saved. This piece of evidence was not: ${evidenceFailures[0]}`
            : `The rest of the step was saved. ${evidenceFailures.length} pieces of evidence were not: ${evidenceFailures.join(' | ')}`,
        );
      }

      const { response } = await this.getStepThree(resultId);

      return this._returnResponse.format({
        response: response,
        message:
          'The Result Complementary Innovation have been saved successfully',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, true);
    }
  }

  async saveinnovationWorkshop(
    user: TokenDto,
    rbi: IpsrStepThreeComponent,
    data_id: any,
  ) {
    try {
      const values: Partial<Ipsr> = {
        readiness_level_evidence_based: rbi?.readiness_level_evidence_based,

        readinees_evidence_link: rbi?.readinees_evidence_link,

        use_level_evidence_based: rbi?.use_level_evidence_based,

        use_evidence_link: rbi?.use_evidence_link,
        use_details_of_evidence: rbi?.use_details_of_evidence,

        readiness_details_of_evidence: rbi?.readiness_details_of_evidence,

        potential_innovation_readiness_level: this.validData(
          rbi?.potential_innovation_readiness_level,
          data_id,
          [2],
        ),
        potential_innovation_use_level: this.validData(
          rbi?.potential_innovation_use_level,
          data_id,
          [2],
        ),
        current_innovation_readiness_level: this.validData(
          rbi?.current_innovation_readiness_level,
          data_id,
          [1, 2],
        ),
        current_innovation_use_level: this.validData(
          rbi?.current_innovation_use_level,
          data_id,
          [1, 2],
        ),
        last_updated_by: user?.id,
      };

      // P2-3824: a level that came with its evidence list owns its legacy columns — they are
      // dual-written from the saved list right after. A stale single link in the same body must
      // not overwrite them (or blank them, from a client that stopped sending the field).
      for (const {
        listKey,
        linkColumn,
        detailsColumn,
      } of STEP_THREE_EVIDENCE_LEVELS) {
        if (Array.isArray(rbi?.[listKey])) {
          delete values[linkColumn];
          delete values[detailsColumn];
        }
      }

      await this._innovationByResultRepository.update(
        rbi.result_by_innovation_package_id,
        values,
      );
      return;
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private validData(data: any, data_id: number, valid: number[]) {
    return valid.includes(parseInt(`${data_id}`)) ? data : null;
  }

  async saveWorkshop(
    resultId: number,
    user: TokenDto,
    saveStepTwoThree: UpdateInnovationPathwayDto,
  ) {
    const id: number = +resultId;
    try {
      const workShopEvidence: Evidence = await this._evidenceRepository.findOne(
        {
          where: {
            result_id: +id,
            evidence_type_id: 5,
            is_active: 1,
          },
        },
      );

      const {
        result_ip: rip,
        link_workshop_list: lwl,
        result_ip_expert_workshop_organized: ripewo,
      } = saveStepTwoThree;

      if (rip.is_expert_workshop_organized === false) {
        // Night sweep 2026-09-23, IPSR-1 — once a package has answered "No", there is no active
        // workshop-list evidence left, and `update(undefined, …)` threw TypeORM's "Empty criteria(s)
        // are not allowed for the update method" → every later Step-1 save answered 500 (and blocked
        // "Save & go to next step") although everything before this point was already written
        // (prtest 11172, 4/4). Nothing to deactivate is not an error.
        if (workShopEvidence?.id) {
          await this._evidenceRepository.update(workShopEvidence.id, {
            is_active: 0,
            last_updated_by: user.id,
          });
        }

        const expertWorkshopExist: ResultIpExpertWorkshopOrganized[] =
          await this._resultIpExpertWorkshopRepository.find({
            where: {
              result_id: resultId,
            },
          });

        if (expertWorkshopExist.length) {
          for (const ewo of expertWorkshopExist) {
            await this._resultIpExpertWorkshopRepository.update(
              ewo.result_ip_expert_workshop_organized_id,
              {
                is_active: false,
                last_updated_by: user.id,
              },
            );
          }
        }

        return {
          message: 'The link workshop list have been inactive successfully',
        };
      }

      // Night sweep 2026-09-23, IPSR-1b — an unanswered workshop question (null) reaches here with no
      // link; inserting a workshop-list evidence without one violated the NOT NULL `link` column
      // ("Field 'link' doesn't have a default value") and every Step-1 save of a NEW package answered
      // 500 (prtest 12037 / 12038, 3/3). No link to store is not an error: nothing is inserted.
      if (!workShopEvidence && lwl) {
        await this._evidenceRepository.save({
          result_id: resultId,
          link: lwl,
          evidence_type_id: 5,
          created_by: user.id,
          last_updated_by: user.id,
        });
      } else if (workShopEvidence) {
        await this._evidenceRepository.update(workShopEvidence.id, {
          link: lwl,
          last_updated_by: user.id,
        });
      }

      /*
       * P2-3747 — a blank row used to abort the whole save.
       *
       * The form hands us one row per facilitator, and it creates blank ones by itself: the
       * section opens with an empty row when there are none, and `Add Lead/Co-Lead` adds another.
       * Bailing out on the first row without a name meant every row AFTER it was never written,
       * the rows the user had removed were never deactivated either (that pass sits below), and
       * `updateMain` returned 200 all the same — so the reporter was told the section had been
       * saved while the facilitator they had just typed was silently dropped.
       *
       * Reproduced on prtest #9409 (2026-09-21): blank row on top, "Maria / Facilitadora /
       * Co-lead" underneath, Save → HTTP 200, and after a reload only the older row was left.
       *
       * A row with no name is a row the user did not fill, not an error: it is skipped, and
       * emptying a saved row still means "remove it" — the deactivation pass below sees it is no
       * longer among the ones worth keeping.
       */
      const namedExperts = (ripewo || []).filter(
        (entity) => entity?.first_name?.trim() && entity?.last_name?.trim(),
      );

      if (namedExperts.length) {
        for (const entity of namedExperts) {
          const expertWorkshopExist: ResultIpExpertWorkshopOrganized =
            await this._resultIpExpertWorkshopRepository.findOne({
              where: {
                result_id: resultId,
                is_active: true,
                first_name: entity.first_name,
                last_name: entity.last_name,
              },
            });

          if (!expertWorkshopExist) {
            await this._resultIpExpertWorkshopRepository.save({
              result_id: resultId,
              first_name: entity.first_name,
              last_name: entity.last_name,
              email: entity.email,
              workshop_role: entity.workshop_role,
              created_by: user.id,
              last_updated_by: user.id,
            });
          } else {
            await this._resultIpExpertWorkshopRepository.update(
              expertWorkshopExist.result_ip_expert_workshop_organized_id,
              {
                first_name: entity.first_name,
                last_name: entity.last_name,
                email: entity.email,
                workshop_role: entity.workshop_role,
                last_updated_by: user.id,
              },
            );
          }
        }

        const expertWorkshopExist: ResultIpExpertWorkshopOrganized[] =
          await this._resultIpExpertWorkshopRepository.find({
            where: {
              result_id: resultId,
              is_active: true,
            },
          });

        for (const ewe of expertWorkshopExist) {
          const isExist = namedExperts.find(
            (x) =>
              x.first_name === ewe.first_name && x.last_name === ewe.last_name,
          );
          if (!isExist) {
            await this._resultIpExpertWorkshopRepository.update(
              ewe.result_ip_expert_workshop_organized_id,
              {
                is_active: false,
                last_updated_by: user.id,
              },
            );
          }
        }
      } else {
        const isExist = await this._resultIpExpertWorkshopRepository.find({
          where: {
            result_id: resultId,
            is_active: true,
          },
        });
        if (isExist.length) {
          for (const ewe of isExist) {
            await this._resultIpExpertWorkshopRepository.update(
              ewe.result_ip_expert_workshop_organized_id,
              {
                is_active: false,
                last_updated_by: user.id,
              },
            );
          }
        }
      }

      return {
        valid: true,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getStepThree(resultId: number) {
    try {
      const result_ip = await this._resultInnovationPackageRepository.findOne({
        where: { result_innovation_package_id: resultId, is_active: true },
        relations: { obj_result_innovation_package: true },
      });
      if (!result_ip) {
        return {
          response: resultId,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const result_core = await this._innovationByResultRepository.findOne({
        where: {
          ipsr_role_id: 1,
          result_innovation_package_id: result_ip.result_innovation_package_id,
          is_active: true,
        },
        relations: [
          'obj_result',
          'obj_readiness_level_evidence_based',
          'obj_use_level_evidence_based',
        ],
      });
      const core_innovation = await this._resultRepository.findOne({
        where: { id: result_core.result_id, is_active: true },
      });
      const result_complementary =
        await this._innovationByResultRepository.find({
          where: {
            ipsr_role_id: 2,
            result_innovation_package_id:
              result_ip.result_innovation_package_id,
            is_active: true,
          },
          relations: [
            'obj_result',
            'obj_readiness_level_evidence_based',
            'obj_use_level_evidence_based',
          ],
        });

      // P2-3824: the evidence lists of every component, in one query for the whole package.
      const stepThreeEvidences =
        await this._evidenceRepository.getIpsrStepThreeEvidences(resultId);
      for (const component of [result_core, ...(result_complementary ?? [])]) {
        this._attachStepThreeEvidences(component, stepThreeEvidences);
      }

      const result_ip_expert_workshop_organized =
        await this._resultIpExpertWorkshopRepository.find({
          where: {
            result_id: resultId,
            is_active: true,
          },
        });

      const returdata: SaveStepTwoThree = {
        innovatonUse: {
          actors: (
            await this._resultsIpActorRepository.find({
              where: {
                is_active: true,
                result_ip_result_id:
                  result_core.result_by_innovation_package_id,
              },
            })
          ).map((el) => ({
            ...el,
            men_non_youth: el.men - el.men_youth,
            women_non_youth: el.women - el.women_youth,
          })),
          measures: await this._resultsByIpInnovationUseMeasureRepository.find({
            where: {
              is_active: true,
              result_ip_result_id: result_core.result_by_innovation_package_id,
            },
          }),
          organization: (
            await this._resultsIpInstitutionTypeRepository.find({
              where: {
                result_ip_results_id:
                  result_core.result_by_innovation_package_id,
                institution_roles_id: 6,
                is_active: true,
              },
              relations: {
                obj_institution_types: { obj_parent: { obj_parent: true } },
              },
            })
          ).map((el) => ({
            ...el,
            parent_institution_type_id: el.obj_institution_types?.obj_parent
              ?.obj_parent?.code
              ? el.obj_institution_types?.obj_parent?.obj_parent?.code
              : el.obj_institution_types?.obj_parent?.code || null,
          })),
        },
        result_innovation_package: result_ip,
        result_ip_result_complementary: result_complementary,
        result_ip_result_core: result_core,
        result_core_innovation: {
          core_result_code: core_innovation.result_code,
          core_title: core_innovation.title,
          core_result_current_phase: core_innovation.version_id,
        },
        result_ip_expert_workshop_organized,
        principal_impact_areas: this._principalImpactAreas(
          result_ip.obj_result_innovation_package,
        ),
      };

      return {
        response: returdata,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async saveInnovationUse(
    user: TokenDto,
    { innovatonUse: crtr, result_ip_result_core: riprc }: SaveStepTwoThree,
  ) {
    const useLevel = await this._innovationByResultRepository.findOne({
      where: {
        result_by_innovation_package_id: riprc.result_by_innovation_package_id,
      },
      relations: ['obj_use_level_evidence_based'],
    });

    if (crtr?.actors?.length) {
      const { actors } = crtr;
      actors.forEach(async (el: ResultsIpActor) => {
        let actorExists: ResultsIpActor = null;

        if (el?.sex_and_age_disaggregation === true && !el?.how_many) {
          return {
            response: { status: 'Error' },
            message: 'The field how many is required',
            status: HttpStatus.BAD_REQUEST,
          };
        }

        if (el?.actor_type_id) {
          const { actor_type_id } = el;
          const whereOptions: any = {
            actor_type_id: el.actor_type_id,
            result_ip_result_id: riprc.result_by_innovation_package_id,
            result_ip_actors_id: el.result_ip_actors_id,
          };

          if (!el?.result_ip_actors_id) {
            switch (`${actor_type_id}`) {
              case '5':
                whereOptions.other_actor_type =
                  el?.other_actor_type || IsNull();
                break;
            }
            delete whereOptions.result_ip_actors_id;
          } else {
            delete whereOptions.actor_type_id;
          }
          actorExists = await this._resultsIpActorRepository.findOne({
            where: whereOptions,
          });
        } else if (!actorExists && el?.result_ip_actors_id) {
          actorExists = await this._resultsIpActorRepository.findOne({
            where: {
              result_ip_actors_id: el?.result_ip_actors_id,
              result_ip_result_id: riprc.result_by_innovation_package_id,
            },
          });
        } else if (!actorExists) {
          actorExists = await this._resultsIpActorRepository.findOne({
            where: {
              actor_type_id: IsNull(),
              result_ip_result_id: riprc.result_by_innovation_package_id,
            },
          });
        }

        if (actorExists) {
          if (!el?.actor_type_id && el?.is_active !== false) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultsIpActorRepository.update(
            actorExists.result_ip_actors_id,
            {
              actor_type_id: this.isNullData(el?.actor_type_id),
              is_active: el.is_active == undefined ? true : el.is_active,
              men: this.isNullData(el?.men),
              men_youth: this.isNullData(el?.men_youth),
              women: this.isNullData(el?.women),
              women_youth: this.isNullData(el?.women_youth),
              evidence_link: this.isNullData(el?.evidence_link),
              other_actor_type: this.isNullData(el?.other_actor_type),
              last_updated_by: user.id,
              sex_and_age_disaggregation:
                el?.sex_and_age_disaggregation === true ? true : false,
              how_many: el?.how_many,
            },
          );
          if (useLevel?.obj_use_level_evidence_based.level === 0) {
            await this._resultsIpActorRepository.update(
              actorExists.result_ip_actors_id,
              {
                actor_type_id: null,
                is_active: false,
                men: null,
                men_youth: null,
                women: null,
                women_youth: null,
                evidence_link: null,
                other_actor_type: null,
                last_updated_by: user.id,
                sex_and_age_disaggregation: null,
                how_many: null,
              },
            );
          }
        } else {
          if (!el?.actor_type_id) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultsIpActorRepository.save({
            actor_type_id: el.actor_type_id,
            is_active: el.is_active,
            men: el.men,
            men_youth: el.men_youth,
            women: el.women,
            women_youth: el.women_youth,
            last_updated_by: user.id,
            created_by: user.id,
            evidence_link: el.evidence_link,
            result_ip_result_id: riprc.result_by_innovation_package_id,
            other_actor_type: el.other_actor_type,
            sex_and_age_disaggregation:
              el?.sex_and_age_disaggregation === true ? true : false,
            how_many: el?.how_many,
          });
        }
      });
    }

    if (crtr?.organization.length) {
      const { organization } = crtr;
      organization.forEach(async (el) => {
        let ite: ResultsIpInstitutionType = null;
        if (el?.institution_types_id && el?.institution_types_id != 78) {
          ite = await this._resultsIpInstitutionTypeRepository.findOne({
            where: {
              institution_types_id: el.institution_types_id,
              result_ip_results_id: riprc.result_by_innovation_package_id,
              institution_roles_id: 6,
            },
          });
        }

        if (!ite && el?.id) {
          ite = await this._resultsIpInstitutionTypeRepository.findOne({
            where: {
              id: el.id,
              result_ip_results_id: riprc.result_by_innovation_package_id,
              institution_roles_id: 6,
            },
          });
        }

        if (ite) {
          if (!el?.institution_types_id && el?.is_active !== false) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultsIpInstitutionTypeRepository.update(ite.id, {
            last_updated_by: user.id,
            institution_types_id: el.institution_types_id,
            how_many: this.isNullData(el.how_many),
            other_institution: el?.other_institution,
            graduate_students: el?.graduate_students,
            is_active: el.is_active == undefined ? true : el.is_active,
            evidence_link: this.isNullData(el.evidence_link),
          });
          if (
            useLevel?.obj_use_level_evidence_based &&
            useLevel.obj_use_level_evidence_based.level === 0
          ) {
            await this._resultsIpInstitutionTypeRepository.update(ite.id, {
              last_updated_by: user.id,
              institution_types_id: null,
              how_many: null,
              other_institution: null,
              graduate_students: null,
              is_active: false,
              evidence_link: null,
            });
          }
        } else {
          if (!el?.institution_types_id) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultsIpInstitutionTypeRepository.save({
            result_ip_results_id: riprc.result_by_innovation_package_id,
            created_by: user.id,
            last_updated_by: user.id,
            institution_types_id: el?.institution_types_id,
            other_institution: el?.other_institution,
            graduate_students: el?.graduate_students,
            institution_roles_id: 6,
            how_many: el?.how_many,
            evidence_link: el?.evidence_link,
          });
        }
      });
    }

    if (crtr?.measures.length) {
      const { measures } = crtr;
      measures.forEach(async (el) => {
        let ripm: ResultsByIpInnovationUseMeasure = null;

        if (el?.unit_of_measure) {
          ripm = await this._resultsByIpInnovationUseMeasureRepository.findOne({
            where: {
              unit_of_measure: el.unit_of_measure,
              result_ip_result_id: riprc.result_by_innovation_package_id,
            },
          });
        } else {
          ripm = await this._resultsByIpInnovationUseMeasureRepository.findOne({
            where: {
              unit_of_measure: IsNull(),
              result_ip_result_id: riprc.result_by_innovation_package_id,
            },
          });
        }

        if (!ripm && el?.result_ip_result_measures_id) {
          ripm = await this._resultsByIpInnovationUseMeasureRepository.findOne({
            where: {
              result_ip_result_measures_id: el.result_ip_result_measures_id,
            },
          });
        }

        if (ripm) {
          await this._resultsByIpInnovationUseMeasureRepository.update(
            ripm.result_ip_result_measures_id,
            {
              unit_of_measure: el.unit_of_measure,
              quantity: el.quantity,
              last_updated_by: user.id,
              evidence_link: el.evidence_link,
              is_active: el.is_active == undefined ? true : el.is_active,
            },
          );
          if (useLevel?.obj_use_level_evidence_based.level === 0) {
            await this._resultsByIpInnovationUseMeasureRepository.update(
              ripm.result_ip_result_measures_id,
              {
                unit_of_measure: null,
                quantity: null,
                last_updated_by: user.id,
                evidence_link: null,
                is_active: false,
              },
            );
          }
        } else {
          if (!el?.unit_of_measure) {
            return {
              response: { status: 'Error' },
              message: 'The field unit of measure is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultsByIpInnovationUseMeasureRepository.save({
            result_ip_result_id: riprc.result_by_innovation_package_id,
            unit_of_measure: el.unit_of_measure,
            quantity: el.quantity,
            created_by: user.id,
            last_updated_by: user.id,
            evidence_link: el.evidence_link,
          });
        }
      });
    }
  }

  /**
   * P2-3824 — validates the Step 3 evidence lists of every component BEFORE the step writes
   * anything: at most `IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT` pieces per component (readiness and
   * use together, stored rows of an omitted level included), no link twice in one list, and the component has to belong to this
   * package (its rows would otherwise be written under the wrong one).
   */
  private async _assertStepThreeEvidences(
    resultId: number,
    components: IpsrStepThreeComponent[],
  ): Promise<void> {
    const withLists = (components ?? []).filter((component) =>
      STEP_THREE_EVIDENCE_LEVELS.some(({ listKey }) =>
        Array.isArray(component?.[listKey]),
      ),
    );
    if (!withLists.length) return;

    const packageComponents = await this._innovationByResultRepository.find({
      where: { result_innovation_package_id: resultId, is_active: true },
    });
    const packageComponentIds = new Set(
      (packageComponents ?? []).map((c) =>
        Number(c.result_by_innovation_package_id),
      ),
    );
    const storedEvidences = withLists.some((component) =>
      STEP_THREE_EVIDENCE_LEVELS.some(
        ({ listKey }) => !Array.isArray(component?.[listKey]),
      ),
    )
      ? ((await this._evidenceRepository.getIpsrStepThreeEvidences(resultId)) ??
        [])
      : [];

    for (const component of withLists) {
      if (
        !packageComponentIds.has(
          Number(component?.result_by_innovation_package_id),
        )
      ) {
        this._rejectStepThree(
          'The evidence could not be saved: one of the innovations is not part of this package any more. Please reload the page and try again.',
        );
      }

      // A level the payload leaves out keeps its stored rows, so they count toward the cap:
      // otherwise saving readiness and use in two requests would reach 12.
      const count = STEP_THREE_EVIDENCE_LEVELS.reduce(
        (total, { level, listKey }) =>
          total +
          (Array.isArray(component?.[listKey])
            ? this._evidenceItems(component[listKey]).length
            : storedEvidences.filter(
                (row) =>
                  Number(row.result_by_innovation_package_id) ===
                    Number(component.result_by_innovation_package_id) &&
                  row.ipsr_evidence_level === level,
              ).length),
        0,
      );
      if (count > IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT) {
        this._rejectStepThree(
          `Each innovation accepts at most ${IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT} pieces of evidence (readiness and use together). Please remove ${count - IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT} before saving.`,
        );
      }

      // Duplicates are checked per level: the same document can back both the readiness and the
      // use level of one innovation.
      for (const { listKey } of STEP_THREE_EVIDENCE_LEVELS) {
        const links = this._evidenceItems(component?.[listKey])
          .map((item) => item?.link?.trim())
          .filter((link) => !!link);
        if (new Set(links).size !== links.length) {
          this._rejectStepThree(
            'The same evidence link appears more than once in one list. Please keep each link only once.',
          );
        }
      }
    }
  }

  /**
   * P2-3824 — saves the lists a component came with and dual-writes the first piece of each level
   * to its legacy single-link columns (NULL when the list is empty). An absent list is left alone.
   * Returns the pieces that could not be saved.
   */
  private async _saveStepThreeEvidences(
    resultId: number,
    component: IpsrStepThreeComponent,
    user: TokenDto,
  ): Promise<string[]> {
    const failures: string[] = [];
    for (const {
      level,
      listKey,
      linkColumn,
      detailsColumn,
    } of STEP_THREE_EVIDENCE_LEVELS) {
      if (!Array.isArray(component?.[listKey])) continue;

      const { first, failures: levelFailures } =
        await this._evidencesService.saveIpsrStepThreeEvidences(
          resultId,
          component.result_by_innovation_package_id,
          level,
          this._evidenceItems(component[listKey]),
          user,
        );
      failures.push(...levelFailures);

      await this._innovationByResultRepository.update(
        component.result_by_innovation_package_id,
        {
          [linkColumn]: first?.link || null,
          [detailsColumn]: first?.description ?? null,
          last_updated_by: user.id,
        },
      );
    }
    return failures;
  }

  /** Items that carry something to store: a link, or a file in the repository. */
  private _evidenceItems(list: unknown): EvidencesCreateInterface[] {
    return (Array.isArray(list) ? list : []).filter(
      (item) => !!item?.link?.trim() || !!item?.is_sharepoint,
    ) as EvidencesCreateInterface[];
  }

  /**
   * Error that `ReturnResponse.format` turns into a 400 with this message (it reads `statusCode`,
   * which `throwServiceError` does not set).
   */
  private _rejectStepThree(message: string): never {
    const error = new Error(message) as Error & {
      statusCode: HttpStatus;
      response: unknown;
    };
    error.statusCode = HttpStatus.BAD_REQUEST;
    error.response = {};
    throw error;
  }

  /**
   * P2-3824 — puts `readiness_evidences` / `use_evidences` on a component. A level with no evidence
   * row yet but a legacy single link shows that link as its first piece (`legacy: true`), so a
   * package saved before the lists existed looks the same and keeps its evidence on the next save.
   */
  private _attachStepThreeEvidences(
    component: IpsrStepThreeComponent,
    evidences: EvidenceWithEvidenceSharepoint[],
  ): void {
    if (!component) return;
    for (const {
      level,
      listKey,
      linkColumn,
      detailsColumn,
    } of STEP_THREE_EVIDENCE_LEVELS) {
      const list = (evidences ?? [])
        .filter(
          (e) =>
            Number(e.result_by_innovation_package_id) ===
              Number(component.result_by_innovation_package_id) &&
            e.ipsr_evidence_level === level,
        )
        .map((e) => this._toStepThreeEvidence(e));

      const legacyLink = (component[linkColumn] as string)?.trim();
      if (!list.length && legacyLink) {
        list.push({
          id: null,
          link: legacyLink,
          description: (component[detailsColumn] as string) ?? null,
          is_sharepoint: false,
          is_public_file: null,
          sp_document_id: null,
          sp_evidence_id: null,
          sp_file_name: null,
          sp_folder_path: null,
          gender_related: false,
          youth_related: false,
          nutrition_related: false,
          environmental_biodiversity_related: false,
          poverty_related: false,
          innovation_use_related: false,
          legacy: true,
        });
      }

      component[listKey] = list;
    }
  }

  private _toStepThreeEvidence(e: any): IpsrStepThreeEvidence {
    return {
      id: Number(e.id),
      link: e.link,
      description: e.description ?? null,
      is_sharepoint: !!e.is_sharepoint,
      is_public_file:
        e.is_public_file === null || e.is_public_file === undefined
          ? null
          : !!e.is_public_file,
      sp_document_id: e.sp_document_id ?? null,
      sp_evidence_id: e.sp_evidence_id ?? null,
      sp_file_name: e.sp_file_name ?? null,
      sp_folder_path: e.sp_folder_path ?? null,
      gender_related: !!e.gender_related,
      youth_related: !!e.youth_related,
      nutrition_related: !!e.nutrition_related,
      environmental_biodiversity_related:
        !!e.environmental_biodiversity_related,
      poverty_related: !!e.poverty_related,
      innovation_use_related: !!e.innovation_use_related,
    };
  }

  /** P2-3824 — Impact Areas the package scored (2) Principal, for the Step 3 alerts. */
  private _principalImpactAreas(result: Result): IpsrPrincipalImpactArea[] {
    return PRINCIPAL_IMPACT_AREA_COLUMNS.filter(
      ([column]) => Number(result?.[column]) === PRINCIPAL_TAG_LEVEL_ID,
    ).map(([, area]) => area);
  }

  isNullData(data: any) {
    return data ?? null;
  }
}
