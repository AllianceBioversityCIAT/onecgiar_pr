import {
  HttpStatus,
  Inject,
  Logger,
  Injectable,
  Optional,
} from '@nestjs/common';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UpdateIpsrGeneralInformationDto } from './dto/update-ipsr_general_information.dto';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultsInvestmentDiscontinuedOptionRepository } from '../../results/results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { IpsrService } from '../../ipsr/ipsr.service';
import { AdUserRepository, AdUserService } from '../../ad_users';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { ImpactAreasScoresComponentRepository } from '../../results/impact_areas_scores_components/repositories/impact_areas_scores_components.repository';
import { GenderTagRepository } from '../../results/gender_tag_levels/genderTag.repository';
import { IpsrRepository } from '../../ipsr/ipsr.repository';
import { extractPropertyValues } from '../../../shared/utils/array.util';
import { ResultImpactAreaScore } from '../../result-impact-area-scores/entities/result-impact-area-score.entity';
import { ResultImpactAreaScoresService } from '../../result-impact-area-scores/result-impact-area-scores.service';
import { ImpactAreaNames } from '../../results/impact_areas_scores_components/enum/impact-area-names.enum';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { Evidence } from '../../results/evidences/entities/evidence.entity';

@Injectable()
export class IpsrGeneralInformationService {
  private readonly _logger: Logger = new Logger(
    IpsrGeneralInformationService.name,
  );

  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _versioningService: VersioningService,
    private readonly _handlersError: HandlersError,
    private readonly _resultsInvestmentDiscontinuedOptionRepository: ResultsInvestmentDiscontinuedOptionRepository,
    private readonly _impactAreasScoresComponentRepository: ImpactAreasScoresComponentRepository,
    protected readonly _ipsrRespository: IpsrRepository,
    private readonly _genderTagRepository: GenderTagRepository,
    private readonly _ipsrService: IpsrService,
    private readonly _resultImpactAreaScoresService: ResultImpactAreaScoresService,
    private readonly _evidencesRepository: EvidencesRepository,
    @Optional()
    @Inject(AdUserService)
    private readonly _adUserService?: AdUserService,
    private readonly _adUserRepository?: AdUserRepository,
  ) {}

  /**
   * Create a new IP result general information for Portfolio P25
   * @param resultId - ID of the result
   * @param updateGeneralInformationDto - Data Transfer Object for updating general information
   * @param user - User token data
   */

  async generalInformation(
    resultId: number,
    updateGeneralInformationDto: UpdateIpsrGeneralInformationDto,
    user: TokenDto,
  ) {
    try {
      const resultExist = await this._resultRepository.findOneBy({
        id: resultId,
      });
      const req = updateGeneralInformationDto;

      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.IPSR,
      );
      if (!version) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }

      const titleValidate = await this._resultRepository
        .createQueryBuilder('result')
        .where('result.title like :title', { title: `${req.title}` })
        .andWhere('result.is_active = 1')
        .getMany();

      if (titleValidate.length > 1) {
        if (!titleValidate.find((tv) => tv.id === resultId)) {
          throw {
            response: titleValidate.map((tv) => tv.id),
            message: `The title already exists, in the following results: ${titleValidate.map(
              (tv) => tv.result_code,
            )}`,
            status: HttpStatus.BAD_REQUEST,
          };
        }
      }

      let status: number;

      if (req?.is_discontinued) {
        status = 4;
      } else if (resultExist.status_id == 4) {
        status = 1;
      } else {
        status = resultExist.status_id;
      }

      let leadContactPersonId: number = null;

      if (req.lead_contact_person_data?.mail && this._adUserService) {
        try {
          let adUser = await this._adUserService.getUserByIdentifier(
            req.lead_contact_person_data.mail,
          );

          if (!adUser) {
            const adUserRepository = this._adUserService['adUserRepository'];
            if (adUserRepository && adUserRepository.saveFromADUser) {
              adUser = await adUserRepository.saveFromADUser(
                req.lead_contact_person_data,
              );

              this._logger.log(
                `Created new AD user: ${adUser.mail} with ID: ${adUser.id}`,
              );
            }
          } else {
            this._logger.log(
              `Found existing AD user: ${adUser.mail} with ID: ${adUser.id}`,
            );
          }

          leadContactPersonId = adUser?.id || null;
        } catch (error) {
          this._logger.warn(
            `Failed to process lead_contact_person_data: ${error.message}`,
          );
        }
      } else if (req.lead_contact_person_data?.mail && !this._adUserService) {
        this._logger.warn(
          'AdUserService not available, skipping lead_contact_person_data processing',
        );
      }

      const resultImpactAreaScores: Partial<ResultImpactAreaScore>[] = [];

      const genderTag = await this.validateTagAndComponent(
        req.gender_tag_level_id,
        req.gender_impact_area_id,
        'Gender',
        resultImpactAreaScores,
      );

      const climateTag = await this.validateTagAndComponent(
        req.climate_change_tag_level_id,
        req.climate_impact_area_id,
        'Climate change',
        resultImpactAreaScores,
      );

      const nutritionTag = await this.validateTagAndComponent(
        req.nutrition_tag_level_id,
        req.nutrition_impact_area_id,
        'Nutrition',
        resultImpactAreaScores,
      );

      const environmentalBiodiversityTag = await this.validateTagAndComponent(
        req.environmental_biodiversity_tag_level_id,
        req.environmental_biodiversity_impact_area_id,
        'Environmental or/and biodiversity',
        resultImpactAreaScores,
      );

      const povertyTag = await this.validateTagAndComponent(
        req.poverty_tag_level_id,
        req.poverty_impact_area_id,
        'Poverty',
        resultImpactAreaScores,
      );

      await this._resultRepository.update(resultId, {
        title: req?.title,
        description: req?.description,
        lead_contact_person: req?.lead_contact_person,
        lead_contact_person_id: leadContactPersonId,
        gender_tag_level_id: genderTag?.id ?? null,
        gender_impact_area_id: null,
        climate_change_tag_level_id: climateTag?.id ?? null,
        climate_impact_area_id: null,
        nutrition_tag_level_id: nutritionTag?.id ?? null,
        nutrition_impact_area_id: null,
        environmental_biodiversity_tag_level_id:
          environmentalBiodiversityTag?.id ?? null,
        environmental_biodiversity_impact_area_id: null,
        poverty_tag_level_id: povertyTag?.id ?? null,
        poverty_impact_area_id: null,
        geographic_scope_id: resultExist.geographic_scope_id,
        last_updated_by: user.id,
        is_discontinued: req?.is_discontinued,
        status_id: status,
      });

      await this._resultImpactAreaScoresService.create(
        resultId,
        resultImpactAreaScores,
        'impact_area_score_id',
        { userId: user.id },
      );

      await this.saveImpactAreaEvidences(resultId, req, user);

      if (req?.is_discontinued) {
        await this._resultsInvestmentDiscontinuedOptionRepository.inactiveData(
          req.discontinued_options.map(
            (el) => el.investment_discontinued_option_id,
          ),
          resultId,
          user.id,
        );
        for (const i of req.discontinued_options) {
          const res =
            await this._resultsInvestmentDiscontinuedOptionRepository.findOne({
              where: {
                result_id: resultId,
                investment_discontinued_option_id:
                  i.investment_discontinued_option_id,
              },
            });

          if (res) {
            await this._resultsInvestmentDiscontinuedOptionRepository.update(
              res.results_investment_discontinued_option_id,
              {
                is_active: i.value,
                description: i?.description,
                last_updated_by: user.id,
              },
            );
          } else {
            await this._resultsInvestmentDiscontinuedOptionRepository.save({
              result_id: resultId,
              investment_discontinued_option_id:
                i.investment_discontinued_option_id,
              description: i?.description,
              is_active: Boolean(i.value),
              created_by: user.id,
              last_updated_by: user.id,
            });
          }
        }
      } else {
        await this._resultsInvestmentDiscontinuedOptionRepository.update(
          { result_id: resultId },
          {
            is_active: false,
            last_updated_by: user.id,
          },
        );
      }

      const { response } = await this._ipsrService.findOneInnovation(resultId);

      return {
        response: response,
        message: 'Successfully updated',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * P2-3210 — the five Impact Area tags and the `evidence` column each one is flagged with.
   *
   * `youth_related` carries the CLIMATE evidence. The column name is inherited from the old form
   * and does not match the label; `ipsr.repository.ts` reads it back exactly the same way
   * (`evidence_climate_tag` ← `youth_related`) and so does the P22 endpoint. Do not "fix" the
   * pairing — it would orphan every climate evidence already reported.
   */
  private static readonly IMPACT_AREA_EVIDENCE_FIELDS: {
    payloadKey: keyof UpdateIpsrGeneralInformationDto;
    relatedColumn: keyof Evidence;
  }[] = [
    { payloadKey: 'evidence_gender_tag', relatedColumn: 'gender_related' },
    { payloadKey: 'evidence_climate_tag', relatedColumn: 'youth_related' },
    {
      payloadKey: 'evidence_nutrition_tag',
      relatedColumn: 'nutrition_related',
    },
    {
      payloadKey: 'evidence_environment_tag',
      relatedColumn: 'environmental_biodiversity_related',
    },
    { payloadKey: 'evidence_poverty_tag', relatedColumn: 'poverty_related' },
  ];

  /**
   * P2-3210 — writes the Impact Area evidence of an innovation package.
   *
   * This endpoint never did. The P22 twin
   * (`ResultInnovationPackageService.generalInformation`) has always upserted these five rows, and
   * the GET both portfolios share reads them back (`ipsr.repository.ts`), so the current portfolio
   * could show an evidence but never store one: whatever the person typed was returned by the
   * server on the next GET as `null`. That is the missing half of "the field sits hidden on the
   * screen they came from" — making the field visible without this would have lost the typing.
   *
   * One deliberate difference from the P22 twin: an ABSENT key (`undefined`) is left alone instead
   * of deactivating the row. P22 treats `undefined` like an empty string, so a caller that does not
   * know about a tag deletes its evidence. Our client always round-trips all five keys, so the
   * user-facing behaviour is identical, and a partial payload can no longer destroy data it never
   * mentioned. An explicit `''`/`null` still means "the person cleared the field".
   */
  private async saveImpactAreaEvidences(
    resultId: number,
    req: UpdateIpsrGeneralInformationDto,
    user: TokenDto,
  ): Promise<void> {
    for (const {
      payloadKey,
      relatedColumn,
    } of IpsrGeneralInformationService.IMPACT_AREA_EVIDENCE_FIELDS) {
      const link = req?.[payloadKey] as string | null | undefined;

      // Key not sent at all: nothing was said about this tag. Never read as "delete it".
      if (link === undefined) continue;

      const existing = await this._evidencesRepository.findOne({
        where: {
          result_id: resultId,
          is_active: 1,
          [relatedColumn]: true,
        },
      });

      if (link) {
        if (existing) {
          await this._evidencesRepository.update(existing.id, {
            link,
            last_updated_by: user.id,
            [relatedColumn]: true,
          });
        } else {
          await this._evidencesRepository.save({
            result_id: resultId,
            link,
            created_by: user.id,
            last_updated_by: user.id,
            // `is_supplementary` defaults to NULL, and the green-check function counts only rows
            // with `is_supplementary = 0` (`migrations/1762528725798-createValidtionP25.ts`), so a
            // row left NULL here would store the evidence and still never turn the section green.
            // The platform's own main-evidence path writes `false` too
            // (`api/results/evidences/evidences.service.ts:185`).
            is_supplementary: false,
            [relatedColumn]: true,
          });
        }
      } else if (existing) {
        await this._evidencesRepository.update(existing.id, {
          is_active: 0,
          last_updated_by: user.id,
        });
      }
    }
  }

  private async validateTagAndComponent(
    tagId: number,
    impactAreaId: number | number[],
    tagName: string,
    impactAreaScoresToAdd: Partial<ResultImpactAreaScore>[],
  ) {
    if (!tagId) {
      return null;
    }
    const tag = await this._genderTagRepository.findOne({
      where: { id: tagId },
    });

    if (!tag) {
      throw {
        response: {},
        message: `The ${tagName} tag does not exist`,
        status: HttpStatus.NOT_FOUND,
      };
    }

    if (Number(tag.id) === 3 && impactAreaId != null) {
      await this._resultImpactAreaScoresService.validateImpactAreaScores(
        impactAreaId,
        impactAreaScoresToAdd,
      );
    }

    return tag;
  }

  async findOneInnovation(resultId: number) {
    try {
      const resultArr =
        await this._ipsrRespository.getResultInnovationById(resultId);
      const result = resultArr[0];
      if (!result) {
        throw new Error('The result was not found.');
      }

      const discontinued_options =
        await this._resultsInvestmentDiscontinuedOptionRepository.find({
          where: {
            result_id: resultId,
            is_active: true,
          },
        });

      let leadContactPersonData = null;
      if (result.lead_contact_person_id) {
        try {
          leadContactPersonData = await this._adUserRepository.findOne({
            where: { id: result.lead_contact_person_id, is_active: true },
          });
        } catch (error) {
          console.warn('Failed to get lead contact person data:', error);
        }
      }
      const resultImpactAreaScores =
        await this._resultImpactAreaScoresService.find(resultId, undefined, {
          impact_area_score: true,
        });

      const ender_impact_area = resultImpactAreaScores.filter(
        (r) => r.impact_area_score.impact_area === ImpactAreaNames.GENDER,
      );
      const climate_impact_area = resultImpactAreaScores.filter(
        (r) => r.impact_area_score.impact_area === ImpactAreaNames.CLIMATE,
      );
      const nutrition_impact_area = resultImpactAreaScores.filter(
        (r) => r.impact_area_score.impact_area === ImpactAreaNames.NUTRITION,
      );
      const environmental_biodiversity_impact_area =
        resultImpactAreaScores.filter(
          (r) =>
            r.impact_area_score.impact_area === ImpactAreaNames.ENVIRONMENTAL,
        );
      const poverty_impact_area = resultImpactAreaScores.filter(
        (r) => r.impact_area_score.impact_area === ImpactAreaNames.POVERTY,
      );

      result.gender_impact_area_id = extractPropertyValues(
        ender_impact_area,
        'impact_area_score_id',
      ) as number[];
      result.climate_impact_area_id = extractPropertyValues(
        climate_impact_area,
        'impact_area_score_id',
      ) as number[];
      result.nutrition_impact_area_id = extractPropertyValues(
        nutrition_impact_area,
        'impact_area_score_id',
      ) as number[];
      result.environmental_biodiversity_impact_area_id = extractPropertyValues(
        environmental_biodiversity_impact_area,
        'impact_area_score_id',
      ) as number[];
      result.poverty_impact_area_id = extractPropertyValues(
        poverty_impact_area,
        'impact_area_score_id',
      ) as number[];
      result.lead_contact_person_data = leadContactPersonData;
      result.discontinued_options = discontinued_options;

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
