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

      const { tag: genderTag, component: genderTagComponent } =
        await this.validateTagAndComponent(
          req.gender_tag_level_id,
          req.gender_impact_area_id,
          'Gender',
        );

      const { tag: climateTag, component: climateTagComponent } =
        await this.validateTagAndComponent(
          req.climate_change_tag_level_id,
          req.climate_impact_area_id,
          'Climate change',
        );

      const { tag: nutritionTag, component: nutritionTagComponent } =
        await this.validateTagAndComponent(
          req.nutrition_tag_level_id,
          req.nutrition_impact_area_id,
          'Nutrition',
        );

      const {
        tag: environmentalBiodiversityTag,
        component: environmentalBiodiversityTagComponent,
      } = await this.validateTagAndComponent(
        req.environmental_biodiversity_tag_level_id,
        req.environmental_biodiversity_impact_area_id,
        'Environmental or/and biodiversity',
      );

      const { tag: povertyTag, component: povertyTagComponent } =
        await this.validateTagAndComponent(
          req.poverty_tag_level_id,
          req.poverty_impact_area_id,
          'Poverty',
        );

      await this._resultRepository.update(resultId, {
        title: req?.title,
        description: req?.description,
        lead_contact_person: req?.lead_contact_person,
        lead_contact_person_id: leadContactPersonId,
        gender_tag_level_id: genderTag?.id ?? null,
        gender_impact_area_id: genderTagComponent?.id ?? null,
        climate_change_tag_level_id: climateTag?.id ?? null,
        climate_impact_area_id: climateTagComponent?.id ?? null,
        nutrition_tag_level_id: nutritionTag?.id ?? null,
        nutrition_impact_area_id: nutritionTagComponent?.id ?? null,
        environmental_biodiversity_tag_level_id:
          environmentalBiodiversityTag?.id ?? null,
        environmental_biodiversity_impact_area_id:
          environmentalBiodiversityTagComponent?.id ?? null,
        poverty_tag_level_id: povertyTag?.id ?? null,
        poverty_impact_area_id: povertyTagComponent?.id ?? null,
        geographic_scope_id: resultExist.geographic_scope_id,
        last_updated_by: user.id,
        is_discontinued: req?.is_discontinued,
        status_id: status,
      });

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

  private async validateTagAndComponent(
    tagId: number,
    impactAreaId: number | null | undefined,
    tagName: string,
  ) {
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

    let component = null;
    if (Number(tag.id) === 3 && impactAreaId != null) {
      component = await this._impactAreasScoresComponentRepository.findOne({
        where: { id: impactAreaId },
      });

      if (!component) {
        throw {
          response: {},
          message: `The ${tagName} tag component does not exist`,
          status: HttpStatus.NOT_FOUND,
        };
      }
    }

    return { tag, component };
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
