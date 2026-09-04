import { Injectable, HttpStatus } from '@nestjs/common';
import { InnovationUseDto } from './dto/create-innovation-use.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { VersionsService } from '../versions/versions.service';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { CapdevDto } from './dto/create-capacity-developents.dto';
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
import { PolicyChangeDto } from '../dto/review-update.dto';
import { EvidencesRepository } from '../evidences/evidences.repository';
import { DataSource, In } from 'typeorm';
import { ResultScalingStudyUrl } from '../../results-framework-reporting/result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { InnovationReadinessLevelByLevel } from '../../results-framework-reporting/innovation_dev/enum/innov-readiness-level.enum';
import { ResultActorRepository } from '../result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { ResultInstitutionsBudgetRepository } from '../result_budget/repositories/result_institutions_budget.repository';
import { InnoDevService } from './innovation_dev.service';
import { ResultAnswerRepository } from '../result-questions/repository/result-answers.repository';
import { ResultAnswer } from '../result-questions/entities/result-answers.entity';
import { Result } from '../entities/result.entity';
import { ResultsInnovationsUseRepository } from './repositories/results-innovations-use.repository';
import { ResultsInnovationsUse } from './entities/results-innovations-use.entity';
import { ResultsByProjectsRepository } from '../results_by_projects/results_by_projects.repository';

@Injectable()
export class SummaryService {
  constructor(
    private readonly _resultsCapacityDevelopmentsRepository: ResultsCapacityDevelopmentsRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    private readonly _resultsPolicyChangesRepository: ResultsPolicyChangesRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionsService: VersionsService,
    private readonly _handlersError: HandlersError,
    private readonly _evidenceRepository: EvidencesRepository,
    private readonly _resultActorRepository: ResultActorRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    private readonly _resultInitiativesBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    private readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _innoDevService: InnoDevService,
    private readonly _resultAnswerRepository: ResultAnswerRepository,
    private readonly _dataSource: DataSource,
    private readonly _resultsInnovationsUseRepository: ResultsInnovationsUseRepository,
    private readonly _resultsByProjectsRepository: ResultsByProjectsRepository,
  ) {}

  /**
   *
   * @param innovation
   * @param resultId
   * @param user
   * @returns
   */
  async saveInnovationUse(
    innovationUseDto: InnovationUseDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const resultExist = await this._resultRepository.findOne({
        where: { id: resultId },
      });

      const InnovationUse = await this._innoDevService.saveAnticipatedInnoUser(
        resultExist.id,
        user.id,
        innovationUseDto,
      );

      const { innov_use_to_be_determined, innovation_use_level_id } =
        innovationUseDto;
      // Deliberately NOT filtered by `is_active`: `results_innovations_use` has a
      // UNIQUE index on `results_id`, so an inactive row still occupies the slot.
      // Filtering it out here made the lookup miss, sent us down the insert branch,
      // and the insert died on ER_DUP_ENTRY — which `returnErrorRes` turned into a
      // response the form never surfaced, so the answer simply vanished on reload.
      // See P2-3359.
      const innUseExists = await this._resultsInnovationsUseRepository.findOne({
        where: { results_id: resultId },
      });
      // P2-3424 — captured BEFORE the overwrite: it is what tells a genuine
      // "Yes → No" retraction apart from a payload that simply never answered.
      const previousHasInnovationLink = innUseExists?.has_innovation_link;
      let innUseRow: ResultsInnovationsUse;
      if (innUseExists) {
        innUseExists.innov_use_to_be_determined =
          innov_use_to_be_determined ?? null;
        innUseExists.innovation_use_level_id = innovation_use_level_id ?? null;
        innUseExists.last_updated_by = user.id;
        // Reactivate rather than insert: the row owns this result's unique slot.
        innUseExists.is_active = true;
        this.applyOptionalInnovationUseFields(innUseExists, innovationUseDto);
        innUseRow =
          await this._resultsInnovationsUseRepository.save(innUseExists);
      } else {
        const newInnUse = new ResultsInnovationsUse();
        // Persist FK via writable @Column (obj_result stub alone is not enough).
        newInnUse.results_id = Number(resultId);
        newInnUse.obj_result = { id: Number(resultId) } as any;
        newInnUse.created_by = user.id;
        newInnUse.last_updated_by = user.id;
        newInnUse.is_active = true;
        newInnUse.innov_use_to_be_determined =
          innov_use_to_be_determined ?? null;
        newInnUse.innovation_use_level_id = innovation_use_level_id ?? null;
        this.applyOptionalInnovationUseFields(newInnUse, innovationUseDto);

        try {
          innUseRow =
            await this._resultsInnovationsUseRepository.save(newInnUse);
        } catch (saveError: any) {
          // Concurrent request won the race for this result's unique slot.
          if (saveError?.driverError?.code !== 'ER_DUP_ENTRY') throw saveError;

          const raced = await this._resultsInnovationsUseRepository.findOne({
            where: { results_id: resultId },
          });
          if (!raced) throw saveError;

          raced.innov_use_to_be_determined = innov_use_to_be_determined ?? null;
          raced.innovation_use_level_id = innovation_use_level_id ?? null;
          raced.last_updated_by = user.id;
          raced.is_active = true;
          this.applyOptionalInnovationUseFields(raced, innovationUseDto);
          innUseRow = await this._resultsInnovationsUseRepository.save(raced);
        }
      }

      await this.saveInnovationUseScalingStudyUrls(
        innUseRow?.result_innovation_use_id,
        innovationUseDto,
        user.id,
      );

      await this.saveInnovationUseLinkedResults(
        resultId,
        innovationUseDto,
        previousHasInnovationLink,
        user.id,
      );

      await this._resultRepository.update(resultId, {
        last_updated_by: user.id,
        last_updated_date: new Date(),
      });

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
   * P2-3424 — tinyint / text columns that already exist on `results_innovations_use` but were being
   * dropped because the DTO never declared them. Written ONLY when the caller sent the key: the same
   * endpoint serves the legacy W1/W2 Innovation Use section and the W3/bilateral one, and a payload that
   * omits a field must leave the stored value exactly as it was.
   */
  private applyOptionalInnovationUseFields(
    entity: ResultsInnovationsUse,
    dto: InnovationUseDto,
  ): void {
    if (dto.has_scaling_studies !== undefined) {
      entity.has_scaling_studies = this.toNullableBoolean(
        dto.has_scaling_studies,
      );
    }
    if (dto.innov_use_2030_to_be_determined !== undefined) {
      entity.innov_use_2030_to_be_determined = this.toNullableBoolean(
        dto.innov_use_2030_to_be_determined,
      );
    }
    if (dto.readiness_level_explanation !== undefined) {
      entity.readiness_level_explanation =
        dto.readiness_level_explanation ?? null;
    }
    if (dto.has_innovation_link !== undefined) {
      entity.has_innovation_link = this.toNullableBoolean(
        dto.has_innovation_link,
      );
    }
  }

  /** `null` stays `null` (question not answered); anything else collapses to a real boolean. */
  private toNullableBoolean(value: unknown): boolean | null {
    return value === null || value === undefined ? null : Boolean(value);
  }

  /**
   * P2-3424 — study links live in `result_scaling_study_urls` keyed by `result_innov_use_id`, the same
   * table the Innovation Development branch of this service already writes through `result_innov_dev_id`.
   * That key belongs exclusively to this section, so a full replace is safe here.
   *
   * The sync only runs when the payload actually says something about the studies: a save that omits
   * `scaling_studies_urls` must not wipe the stored links (that is how "Yes" + an untouched autosave
   * would have erased them).
   */
  private async saveInnovationUseScalingStudyUrls(
    resultInnovationUseId: number | undefined,
    dto: InnovationUseDto,
    userId: number,
  ): Promise<void> {
    if (!resultInnovationUseId) return;

    const hasScalingAnswer = this.toNullableBoolean(dto.has_scaling_studies);
    const shouldSync =
      dto.scaling_studies_urls !== undefined || hasScalingAnswer === false;
    if (!shouldSync) return;

    const urls =
      hasScalingAnswer === false
        ? []
        : (dto.scaling_studies_urls ?? [])
            .map((url) => String(url ?? '').trim())
            .filter((url) => url !== '');

    const scalingStudyUrlRepository = this._dataSource.getRepository(
      ResultScalingStudyUrl,
    );
    await scalingStudyUrlRepository.update(
      { result_innov_use_id: resultInnovationUseId },
      { is_active: false, last_updated_by: userId },
    );

    if (!urls.length) return;

    await scalingStudyUrlRepository.save(
      urls.map((url) => ({
        result_innov_use_id: resultInnovationUseId,
        study_url: url,
        is_active: true,
        created_by: userId,
        last_updated_by: userId,
      })),
    );
  }

  /**
   * P2-3424 — `linked_result` is SHARED: the P22 "Links to results" section writes rows for the same
   * `origin_result_id`, so this endpoint must never wipe it opportunistically. Two narrow cases only:
   *  - the payload answers "Yes" and carries a selection → that selection becomes the stored set;
   *  - the payload answers "No" AND the stored answer was "Yes" → the retraction clears the links.
   * A payload that leaves the question unanswered (`null`) or omits it altogether touches nothing.
   */
  private async saveInnovationUseLinkedResults(
    resultId: number,
    dto: InnovationUseDto,
    previousHasInnovationLink: unknown,
    userId: number,
  ): Promise<void> {
    if (dto.has_innovation_link === undefined) return;

    const linkAnswer = this.toNullableBoolean(dto.has_innovation_link);

    if (linkAnswer === true) {
      if (dto.linked_results === undefined) return;
      await this._resultsInnovationsUseRepository.replaceLinkedResultsByOrigin(
        resultId,
        dto.linked_results,
        userId,
      );
      return;
    }

    if (linkAnswer === false && Boolean(previousHasInnovationLink)) {
      await this._resultsInnovationsUseRepository.replaceLinkedResultsByOrigin(
        resultId,
        [],
        userId,
      );
    }
  }

  /**
   *
   * @param resultId
   * @returns
   */
  async getInnovationUse(resultId: number) {
    try {
      const actorsData = await this._resultActorRepository.find({
        where: { result_id: resultId, is_active: true },
        relations: { obj_actor_type: true },
      });
      actorsData.map((el) => {
        el['men_non_youth'] = el.men - el.men_youth;
        el['women_non_youth'] = el.women - el.women_youth;
      });
      const innUseExists = await this._resultsInnovationsUseRepository.findOne({
        where: { results_id: resultId, is_active: true },
      });
      // P2-3424 — read side of the fields this endpoint now persists. Purely additive: every key that
      // was already in the response keeps its exact shape.
      const scaling_studies_urls = innUseExists?.result_innovation_use_id
        ? (
            await this._dataSource.getRepository(ResultScalingStudyUrl).find({
              where: {
                result_innov_use_id: innUseExists.result_innovation_use_id,
                is_active: true,
              },
            })
          ).map((u) => u.study_url)
        : [];
      const linked_results =
        await this._resultsInnovationsUseRepository.getLinkedResultsByOrigin(
          resultId,
        );

      const innovatonUse = {
        innov_use_to_be_determined:
          innUseExists?.innov_use_to_be_determined ?? null,
        innovation_use_level_id: innUseExists?.innovation_use_level_id ?? null,
        has_scaling_studies: innUseExists?.has_scaling_studies ?? null,
        scaling_studies_urls,
        innov_use_2030_to_be_determined:
          innUseExists?.innov_use_2030_to_be_determined ?? null,
        readiness_level_explanation:
          innUseExists?.readiness_level_explanation ?? null,
        has_innovation_link: innUseExists?.has_innovation_link ?? null,
        linked_results,
        actors: actorsData,
        measures: await this._resultIpMeasureRepository.find({
          where: { result_id: resultId, is_active: true },
        }),
        organization: (
          await this._resultByIntitutionsTypeRepository.find({
            where: {
              results_id: resultId,
              institution_roles_id: 5,
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
      };

      return {
        response: innovatonUse,
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
  async saveCapacityDevelopents(
    capdev: CapdevDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const {
        female_using,
        male_using,
        has_unkown_using,
        non_binary_using,
        capdev_delivery_method_id,
        capdev_term_id,
        institutions,
        is_attending_for_organization,
      } = capdev;
      const capDevExists =
        await this._resultsCapacityDevelopmentsRepository.capDevExists(
          resultId,
        );
      let CapDevData: ResultsCapacityDevelopments = undefined;
      if (capDevExists) {
        capDevExists.female_using = female_using || 0;
        capDevExists.male_using = male_using || 0;
        capDevExists.has_unkown_using = has_unkown_using || 0;
        capDevExists.non_binary_using = non_binary_using || 0;
        capDevExists.last_updated_by = user.id;
        capDevExists.capdev_delivery_method_id = capdev_delivery_method_id;
        capDevExists.capdev_term_id = capdev_term_id;
        capDevExists.is_attending_for_organization =
          is_attending_for_organization;
        CapDevData =
          await this._resultsCapacityDevelopmentsRepository.save(capDevExists);
      } else {
        const newCapDev = new ResultsCapacityDevelopments();
        newCapDev.created_by = user.id;
        newCapDev.last_updated_by = user.id;
        newCapDev.female_using = female_using || 0;
        newCapDev.male_using = male_using || 0;
        newCapDev.has_unkown_using = has_unkown_using || 0;
        newCapDev.result_object = { id: resultId } as Result;
        newCapDev.non_binary_using = non_binary_using || 0;
        newCapDev.result_id = resultId;
        newCapDev.capdev_delivery_method_id = capdev_delivery_method_id;
        newCapDev.capdev_term_id = capdev_term_id;
        newCapDev.is_attending_for_organization = is_attending_for_organization;
        CapDevData =
          await this._resultsCapacityDevelopmentsRepository.save(newCapDev);
      }

      if (institutions?.length) {
        const institutionsList: ResultsByInstitution[] = [];
        await this._resultByIntitutionsRepository.updateGenericIstitutions(
          resultId,
          institutions,
          3,
          user.id,
        );
        for (let index = 0; index < institutions.length; index++) {
          const { institutions_id } = institutions[index];
          const instiExists =
            await this._resultByIntitutionsRepository.getGenericResultByInstitutionExists(
              resultId,
              institutions_id,
              3,
            );
          if (!instiExists) {
            const newInstitution = new ResultsByInstitution();
            newInstitution.institution_roles_id = 3;
            newInstitution.created_by = user.id;
            newInstitution.last_updated_by = user.id;
            newInstitution.institutions_id = institutions_id;
            newInstitution.result_id = resultId;
            institutionsList.push(newInstitution);
          }
        }
        await this._resultByIntitutionsRepository.save(institutionsList);
      } else {
        await this._resultByIntitutionsRepository.updateGenericIstitutions(
          resultId,
          [],
          3,
          user.id,
        );
      }

      await this._resultRepository.update(resultId, {
        last_updated_by: user.id,
        last_updated_date: new Date(),
      });

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
      const capDevExists =
        await this._resultsCapacityDevelopmentsRepository.capDevExists(
          resultId,
        );
      const capDepInstitutions =
        await this._resultByIntitutionsRepository.getGenericAllResultByInstitutionByRole(
          resultId,
          3,
        );

      if (!capDevExists) {
        return {
          response: {
            result_capacity_development_id: null,
            result_id: resultId,
            male_using: null,
            female_using: null,
            non_binary_using: null,
            has_unkown_using: null,
            capdev_delivery_method_id: null,
            capdev_term_id: null,
            is_attending_for_organization: null,
            institutions: capDepInstitutions,
          },
          message: 'No capacity development data found for this result',
          status: HttpStatus.OK,
        };
      }

      return {
        response: {
          ...capDevExists,
          institutions: capDepInstitutions,
        },
        message: 'Capacity Developents has been created successfully',
        status: HttpStatus.OK,
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
  async saveInnovationDev(
    createInnovationDevDto: CreateInnovationDevDto,
    innovationUseDto: InnovationUseDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const innDevExists =
        await this._resultsInnovationsDevRepository.InnovationDevExists(
          resultId,
        );
      const {
        evidences_justification,
        innovation_characterization_id,
        innovation_collaborators,
        innovation_developers,
        innovation_nature_id,
        innovation_readiness_level_id,
        is_new_variety,
        has_scaling_studies,
        scaling_studies_urls,
        number_of_varieties,
        readiness_level,
        result_innovation_dev_id,
        short_title,
        innovation_acknowledgement,
        innovation_pdf,
        innovation_user_to_be_determined,
      } = createInnovationDevDto;

      let InnDevRes: ResultsInnovationsDev = undefined;
      if (innDevExists) {
        innDevExists.short_title = short_title;
        innDevExists.last_updated_by = user.id;
        innDevExists.is_new_variety = is_new_variety;
        innDevExists.has_scaling_studies = has_scaling_studies;
        innDevExists.readiness_level = readiness_level;
        innDevExists.number_of_varieties = number_of_varieties;
        innDevExists.innovation_developers = innovation_developers;
        innDevExists.evidences_justification = evidences_justification;
        innDevExists.innovation_collaborators = innovation_collaborators;
        if (result_innovation_dev_id != null) {
          innDevExists.result_innovation_dev_id = result_innovation_dev_id;
        }
        innDevExists.innovation_acknowledgement = innovation_acknowledgement;
        innDevExists.innovation_pdf = innovation_pdf;
        innDevExists.innovation_user_to_be_determined =
          innovation_user_to_be_determined;
        this.applyInnovationDevFkRelations(innDevExists, {
          innovation_nature_id,
          innovation_readiness_level_id,
          innovation_characterization_id,
        });
        InnDevRes = await this._resultsInnovationsDevRepository.save(
          innDevExists as any,
        );
      } else {
        const newInnDev = new ResultsInnovationsDev();
        newInnDev.created_by = user.id;
        // Persist FK via writable @Column (result_object stub alone is not enough).
        newInnDev.results_id = Number(resultId);
        newInnDev.result_object = { id: Number(resultId) } as any;
        newInnDev.last_updated_by = user.id;
        newInnDev.short_title = short_title;
        newInnDev.is_active = true;
        newInnDev.is_new_variety = is_new_variety;
        newInnDev.has_scaling_studies = has_scaling_studies;
        newInnDev.readiness_level = readiness_level;
        newInnDev.number_of_varieties = number_of_varieties;
        newInnDev.innovation_developers = innovation_developers;
        newInnDev.evidences_justification = evidences_justification;
        newInnDev.innovation_collaborators = innovation_collaborators;
        // Never assign null PK — TypeORM would INSERT NULL and break AUTO_INCREMENT.
        newInnDev.innovation_user_to_be_determined =
          innovation_user_to_be_determined;
        this.applyInnovationDevFkRelations(newInnDev, {
          innovation_nature_id,
          innovation_readiness_level_id,
          innovation_characterization_id,
        });
        InnDevRes = await this._resultsInnovationsDevRepository.save(newInnDev);
      }

      // Nested questionnaire / investment blocks are required for Result Review full saves,
      // but bilateral type-specific autosave sends only core Inn Dev fields. Skip when absent.
      const ris = createInnovationDevDto?.responsible_innovation_and_scaling;
      if (ris?.q1?.options) {
        await this._innoDevService.saveOptionsAndSubOptions(
          resultId,
          user.id,
          ris.q1.options,
        );
      }
      if (ris?.q2?.options) {
        await this._innoDevService.saveOptionsAndSubOptions(
          resultId,
          user.id,
          ris.q2.options,
        );
      }

      const ipr = createInnovationDevDto?.intellectual_property_rights;
      if (ipr?.q1?.options) {
        await this._innoDevService.saveOptionsAndSubOptions(
          resultId,
          user.id,
          ipr.q1.options,
        );
      }
      if (ipr?.q2?.options) {
        await this._innoDevService.saveOptionsAndSubOptions(
          resultId,
          user.id,
          ipr.q2.options,
        );
      }
      if (ipr?.q3?.options) {
        await this._innoDevService.saveOptionsAndSubOptions(
          resultId,
          user.id,
          ipr.q3.options,
        );
      }

      if (createInnovationDevDto?.innovation_team_diversity?.options) {
        await this._innoDevService.saveOptionsAndSubOptions(
          resultId,
          user.id,
          createInnovationDevDto.innovation_team_diversity.options,
        );
      }
      if (createInnovationDevDto?.megatrends?.options) {
        await this._innoDevService.saveOptionsAndSubOptions(
          resultId,
          user.id,
          createInnovationDevDto.megatrends.options,
        );
      }

      if (createInnovationDevDto?.reference_materials != null) {
        await this._innoDevService.saveEvidence(
          resultId,
          user.id,
          createInnovationDevDto.reference_materials,
          4,
        );
      }

      if (createInnovationDevDto?.initiative_expected_investment != null) {
        await this._innoDevService.saveInitiativeInvestment(
          resultId,
          user.id,
          createInnovationDevDto,
        );
      }
      if (createInnovationDevDto?.bilateral_expected_investment != null) {
        await this._innoDevService.saveBillateralInvestment(
          resultId,
          user.id,
          createInnovationDevDto,
        );
      }
      if (createInnovationDevDto?.institutions_expected_investment != null) {
        await this._innoDevService.savePartnerInvestment(
          user.id,
          createInnovationDevDto,
        );
      }

      // Same gating rule as the v2 innovation-dev service: scaling studies only
      // apply once the innovation itself has reached readiness level 6+.
      if (
        Number(innovation_readiness_level_id) >=
          InnovationReadinessLevelByLevel.Level_6 &&
        has_scaling_studies &&
        scaling_studies_urls?.length
      ) {
        const scalingStudyUrlRepository = this._dataSource.getRepository(
          ResultScalingStudyUrl,
        );
        await scalingStudyUrlRepository.update(
          { result_innov_dev_id: InnDevRes.result_innovation_dev_id },
          { is_active: false },
        );
        await scalingStudyUrlRepository.save(
          scaling_studies_urls.map((url) => ({
            result_innov_dev_id: InnDevRes.result_innovation_dev_id,
            study_url: url,
            is_active: true,
            created_by: user.id,
          })),
        );
      }

      // Result Review always sends innovationUseDto; bilateral core save omits it.
      if (innovationUseDto != null) {
        await this._innoDevService.saveAnticipatedInnoUser(
          resultId,
          user.id,
          innovationUseDto,
        );
      }

      await this._resultRepository.update(resultId, {
        last_updated_by: user.id,
        last_updated_date: new Date(),
      });

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
   * FK fields on ResultsInnovationsDev are @RelationId (read-only). Persist via JoinColumn relations.
   */
  private applyInnovationDevFkRelations(
    entity: any,
    relations: {
      innovation_readiness_level_id?: number | null;
      innovation_nature_id?: number | null;
      innovation_characterization_id?: number | null;
    },
  ): void {
    const {
      innovation_readiness_level_id,
      innovation_nature_id,
      innovation_characterization_id,
    } = relations;

    if (innovation_readiness_level_id !== undefined) {
      entity.innovation_readiness_level =
        innovation_readiness_level_id == null
          ? null
          : ({ id: innovation_readiness_level_id } as any);
    }

    if (innovation_nature_id !== undefined) {
      entity.innovation_nature =
        innovation_nature_id == null
          ? null
          : ({ code: innovation_nature_id } as any);
    }

    if (innovation_characterization_id !== undefined) {
      entity.innovation_characterization =
        innovation_characterization_id == null
          ? null
          : ({ id: innovation_characterization_id } as any);
    }
  }

  /**
   *
   * @param resultId
   * @returns
   */
  async getInnovationDev(resultId: number) {
    try {
      const innDevExists =
        await this._resultsInnovationsDevRepository.InnovationDevExists(
          resultId,
        );

      const pictures = await this._evidenceRepository.find({
        where: { result_id: resultId, evidence_type_id: 3, is_active: 1 },
      });
      const reference_materials = await this._evidenceRepository.find({
        where: { result_id: resultId, evidence_type_id: 4, is_active: 1 },
      });
      const result = await this._resultRepository.getResultById(resultId);

      const actorsData = await this._resultActorRepository.find({
        where: { result_id: resultId, is_active: true },
        relations: { obj_actor_type: true },
      });
      const innovatonUse = {
        actors: actorsData,
        measures: await this._resultIpMeasureRepository.find({
          where: { result_id: resultId, is_active: true },
        }),
        organization: (
          await this._resultByIntitutionsTypeRepository.find({
            where: {
              results_id: resultId,
              institution_roles_id: 5,
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
      };

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

      const npp = await this._nonPooledProjectRepository.find({
        where: {
          results_id: resultId,
          is_active: true,
          non_pooled_project_type_id: 1,
        },
      });

      const legacyBilateralInvestment =
        await this._resultBilateralBudgetRepository.find({
          where: {
            non_pooled_projetct_id: In(npp.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_non_pooled_projetct: {
              obj_funder_institution_id: true,
            },
          },
        });

      // Bilateral projects are linked via `results_by_projects` (not the legacy
      // `non_pooled_project` catalog), so their budget rows are keyed by
      // `result_project_id` instead — read-only merge here; saving through this
      // (legacy) endpoint still only understands `non_pooled_projetct_id`.
      const resultProjects = await this._resultsByProjectsRepository.find({
        where: { result_id: resultId, is_active: true },
      });
      const resultProjectBilateralInvestment =
        await this._resultBilateralBudgetRepository.find({
          where: {
            result_project_id: In(resultProjects.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_result_project: {
              obj_clarisa_project: true,
            },
          },
        });

      const bilateral_expected_investment = [
        ...legacyBilateralInvestment,
        ...resultProjectBilateralInvestment,
      ];

      const institutions: ResultsByInstitution[] =
        await this._resultByIntitutionsRepository.find({
          where: { result_id: resultId, is_active: true },
        });
      const institutions_expected_investment =
        await this._resultInstitutionsBudgetRepository.find({
          where: {
            result_institution_id: In(institutions.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_result_institution: {
              obj_institutions: {
                obj_institution_type_code: true,
              },
            },
          },
        });

      let scaling_studies_urls: string[] = [];
      if (
        Number(innDevExists?.innovation_readiness_level_id) >=
        InnovationReadinessLevelByLevel.Level_6
      ) {
        const urls = await this._dataSource
          .getRepository(ResultScalingStudyUrl)
          .find({
            where: {
              result_innov_dev_id: innDevExists.result_innovation_dev_id,
              is_active: true,
            },
          });
        scaling_studies_urls = urls.map((u) => u.study_url);
      }

      return {
        response: {
          ...innDevExists,
          pictures,
          innovatonUse,
          initiative_expected_investment,
          bilateral_expected_investment,
          institutions_expected_investment,
          scaling_studies_urls,
          reference_materials,
          result,
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
  async savePolicyChanges(
    policyChangesDto: PolicyChangesDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const resultsPolicyChanges =
        await this._resultsPolicyChangesRepository.ResultsPolicyChangesExists(
          resultId,
        );
      const {
        amount,
        institutions,
        policy_stage_id,
        policy_type_id,
        status_amount,
        optionsWithAnswers,
        result_related_engagement,
        actors_influenced,
      } = policyChangesDto;

      let policyChangesData: ResultsPolicyChanges = undefined;
      if (resultsPolicyChanges) {
        resultsPolicyChanges.amount = amount || null;
        resultsPolicyChanges.last_updated_by = user.id;
        resultsPolicyChanges.policy_stage_id = policy_stage_id;
        resultsPolicyChanges.policy_type_id = policy_type_id;
        resultsPolicyChanges.result_related_engagement =
          result_related_engagement;
        resultsPolicyChanges.status_amount = status_amount;
        // P2-2932 AC4. `?? null` rather than `|| null`: a reported 0 is a figure someone entered
        // ("no actors were influenced"), and `||` would erase it into an empty field.
        resultsPolicyChanges.actors_influenced = actors_influenced ?? null;
        policyChangesData =
          await this._resultsPolicyChangesRepository.save(resultsPolicyChanges);
      } else {
        const newResultsPolicyChanges = new ResultsPolicyChanges();
        newResultsPolicyChanges.amount = amount || null;
        newResultsPolicyChanges.policy_stage_id = policy_stage_id;
        newResultsPolicyChanges.policy_type_id = policy_type_id;
        newResultsPolicyChanges.result_related_engagement =
          result_related_engagement;
        newResultsPolicyChanges.result_id = resultId;
        newResultsPolicyChanges.created_by = user.id;
        newResultsPolicyChanges.last_updated_by = user.id;
        newResultsPolicyChanges.status_amount = status_amount;
        newResultsPolicyChanges.actors_influenced = actors_influenced ?? null;
        policyChangesData = await this._resultsPolicyChangesRepository.save(
          newResultsPolicyChanges,
        );
      }

      if (institutions?.length) {
        const institutionsList: ResultsByInstitution[] = [];
        await this._resultByIntitutionsRepository.updateGenericIstitutions(
          resultId,
          institutions,
          4,
          user.id,
        );
        for (let index = 0; index < institutions.length; index++) {
          const { institutions_id } = institutions[index];
          const instiExists =
            await this._resultByIntitutionsRepository.getGenericResultByInstitutionExists(
              resultId,
              institutions_id,
              4,
            );
          if (!instiExists) {
            const newInstitution = new ResultsByInstitution();
            newInstitution.institution_roles_id = 4;
            newInstitution.created_by = user.id;
            newInstitution.last_updated_by = user.id;
            newInstitution.institutions_id = institutions_id;
            newInstitution.result_id = resultId;
            institutionsList.push(newInstitution);
          }
        }
        await this._resultByIntitutionsRepository.save(institutionsList);
      } else {
        await this._resultByIntitutionsRepository.updateGenericIstitutions(
          resultId,
          [],
          4,
          user.id,
        );
      }

      for (const answer of optionsWithAnswers ?? []) {
        const optionExist = await this._resultAnswerRepository.findOne({
          where: {
            result_id: resultId,
            result_question_id: answer.result_question_id,
          },
        });

        if (optionExist) {
          optionExist.answer_boolean = answer.answer_boolean || false;
          optionExist.answer_text = answer.answer_text;
          optionExist.last_updated_by = user.id;
          await this._resultAnswerRepository.save(optionExist);
        } else {
          const optionAnswer = new ResultAnswer();
          optionAnswer.result_question_id = answer.result_question_id;
          optionAnswer.answer_boolean = answer.answer_boolean || false;
          optionAnswer.answer_text = answer.answer_text;
          optionAnswer.result_id = resultId;
          optionAnswer.created_by = user.id;
          optionAnswer.last_updated_by = user.id;

          await this._resultAnswerRepository.save(optionAnswer);
        }
      }

      await this._resultRepository.update(resultId, {
        last_updated_by: user.id,
        last_updated_date: new Date(),
      });

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
      const policyChangesExists =
        await this._resultsPolicyChangesRepository.ResultsPolicyChangesExists(
          resultId,
        );
      if (!policyChangesExists) {
        throw {
          response: {},
          message: 'Results Innovations Dev not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const policyChangesInstitutions =
        await this._resultByIntitutionsRepository.getGenericAllResultByInstitutionByRole(
          resultId,
          4,
        );
      return {
        response: {
          ...policyChangesExists,
          institutions: policyChangesInstitutions,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async updatePolicyChangesPartial(
    resultId: number,
    policyChangeDto: PolicyChangeDto,
    user: TokenDto,
  ) {
    try {
      const resultsPolicyChanges =
        await this._resultsPolicyChangesRepository.ResultsPolicyChangesExists(
          resultId,
        );

      if (!resultsPolicyChanges) {
        return {
          response: {},
          message: 'Policy changes record not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      this._updatePolicyChangesFields(
        resultsPolicyChanges,
        policyChangeDto,
        user.id,
      );

      const updatedPolicyChanges =
        await this._resultsPolicyChangesRepository.save(resultsPolicyChanges);

      if (policyChangeDto.implementing_organization !== undefined) {
        await this._updateImplementingOrganizations(
          resultId,
          policyChangeDto.implementing_organization,
          user.id,
        );
      }

      return {
        response: updatedPolicyChanges,
        message: 'Policy changes updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private _updatePolicyChangesFields(
    resultsPolicyChanges: ResultsPolicyChanges,
    policyChangeDto: PolicyChangeDto,
    userId: number,
  ): void {
    if (policyChangeDto.policy_type_id !== undefined) {
      resultsPolicyChanges.policy_type_id = policyChangeDto.policy_type_id;
    }

    if (policyChangeDto.policy_stage_id !== undefined) {
      resultsPolicyChanges.policy_stage_id = policyChangeDto.policy_stage_id;
    }

    resultsPolicyChanges.last_updated_by = userId;
  }

  private async _updateImplementingOrganizations(
    resultId: number,
    organizations: any[],
    userId: number,
  ): Promise<void> {
    const institutions = organizations
      .filter(
        (org) =>
          org.institution_id !== null && org.institution_id !== undefined,
      )
      .map((org) => ({
        institutions_id: org.institution_id,
      }));

    await this._resultByIntitutionsRepository.updateGenericIstitutions(
      resultId,
      institutions,
      4, // institution_roles_id = 4 for implementing organizations
      userId,
    );

    const institutionsList = await this._createNewImplementingOrganizations(
      resultId,
      organizations,
      userId,
    );

    if (institutionsList.length > 0) {
      await this._resultByIntitutionsRepository.save(institutionsList);
    }
  }

  private async _createNewImplementingOrganizations(
    resultId: number,
    organizations: any[],
    userId: number,
  ): Promise<ResultsByInstitution[]> {
    const institutionsList: ResultsByInstitution[] = [];

    for (const org of organizations) {
      if (org.institution_id === null || org.institution_id === undefined) {
        continue;
      }

      const instiExists =
        await this._resultByIntitutionsRepository.getGenericResultByInstitutionExists(
          resultId,
          org.institution_id,
          4,
        );

      if (!instiExists) {
        const newInstitution = new ResultsByInstitution();
        newInstitution.institution_roles_id = 4;
        newInstitution.created_by = userId;
        newInstitution.last_updated_by = userId;
        newInstitution.institutions_id = org.institution_id;
        newInstitution.result_id = resultId;
        institutionsList.push(newInstitution);
      }
    }

    return institutionsList;
  }
}
