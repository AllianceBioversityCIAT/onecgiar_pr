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

      await this.validateAndGetActiveVersion();
      await this.validateTitle(resultId, updateGeneralInformationDto.title);

      const status = this.calculateStatus(
        resultExist.status_id,
        updateGeneralInformationDto.is_discontinued,
      );

      const leadContactPersonId =
        await this.processLeadContactPerson(
          updateGeneralInformationDto.lead_contact_person_data,
        );

      const tagsData = await this.validateAllTagsAndComponents(
        updateGeneralInformationDto,
      );

      await this.updateResult(resultId, {
        ...updateGeneralInformationDto,
        leadContactPersonId,
        tagsData,
        status,
        geographicScopeId: resultExist.geographic_scope_id,
        userId: user.id,
      });

      await this.handleDiscontinuedOptions(
        resultId,
        updateGeneralInformationDto,
        user.id,
      );

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

  private async validateAndGetActiveVersion() {
    const version = await this._versioningService.$_findActivePhase(
      AppModuleIdEnum.IPSR,
    );
    if (!version) {
      throw this._handlersError.returnErrorRes({
        error: version,
        debug: true,
      });
    }
    return version;
  }

  private async validateTitle(resultId: number, title: string) {
    const titleValidate = await this._resultRepository
      .createQueryBuilder('result')
      .where('result.title like :title', { title: `${title}` })
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
  }

  private calculateStatus(
    currentStatusId: number,
    isDiscontinued?: boolean,
  ): number {
    if (isDiscontinued) {
      return 4;
    }
    if (currentStatusId === 4) {
      return 1;
    }
    return currentStatusId;
  }

  private async processLeadContactPerson(
    leadContactPersonData?: { mail?: string; name?: string },
  ): Promise<number | null> {
    if (!leadContactPersonData?.mail) {
      return null;
    }

    if (!this._adUserService) {
      this._logger.warn(
        'AdUserService not available, skipping lead_contact_person_data processing',
      );
      return null;
    }

    try {
      let adUser = await this._adUserService.getUserByIdentifier(
        leadContactPersonData.mail,
      );

      if (!adUser) {
        const adUserRepository = this._adUserService['adUserRepository'];
        if (adUserRepository?.saveFromADUser) {
          adUser = await adUserRepository.saveFromADUser(leadContactPersonData);
          this._logger.log(
            `Created new AD user: ${adUser.mail} with ID: ${adUser.id}`,
          );
        }
      } else {
        this._logger.log(
          `Found existing AD user: ${adUser.mail} with ID: ${adUser.id}`,
        );
      }

      return adUser?.id || null;
    } catch (error) {
      this._logger.warn(
        `Failed to process lead_contact_person_data: ${error.message}`,
      );
      return null;
    }
  }

  private async validateAllTagsAndComponents(
    dto: UpdateIpsrGeneralInformationDto,
  ) {
    const [gender, climate, nutrition, environmental, poverty] =
      await Promise.all([
        this.validateTagAndComponent(
          dto.gender_tag_level_id,
          dto.gender_impact_area_id,
          'Gender',
        ),
        this.validateTagAndComponent(
          dto.climate_change_tag_level_id,
          dto.climate_impact_area_id,
          'Climate change',
        ),
        this.validateTagAndComponent(
          dto.nutrition_tag_level_id,
          dto.nutrition_impact_area_id,
          'Nutrition',
        ),
        this.validateTagAndComponent(
          dto.environmental_biodiversity_tag_level_id,
          dto.environmental_biodiversity_impact_area_id,
          'Environmental or/and biodiversity',
        ),
        this.validateTagAndComponent(
          dto.poverty_tag_level_id,
          dto.poverty_impact_area_id,
          'Poverty',
        ),
      ]);

    return {
      gender,
      climate,
      nutrition,
      environmental,
      poverty,
    };
  }

  private async updateResult(
    resultId: number,
    data: {
      title?: string;
      description?: string;
      lead_contact_person?: string;
      leadContactPersonId: number | null;
      tagsData: {
        gender: { tag: any; component: any };
        climate: { tag: any; component: any };
        nutrition: { tag: any; component: any };
        environmental: { tag: any; component: any };
        poverty: { tag: any; component: any };
      };
      status: number;
      geographicScopeId: number;
      userId: number;
      is_discontinued?: boolean;
    },
  ) {
    await this._resultRepository.update(resultId, {
      title: data.title,
      description: data.description,
      lead_contact_person: data.lead_contact_person,
      lead_contact_person_id: data.leadContactPersonId,
      gender_tag_level_id: data.tagsData.gender.tag?.id ?? null,
      gender_impact_area_id: data.tagsData.gender.component?.id ?? null,
      climate_change_tag_level_id: data.tagsData.climate.tag?.id ?? null,
      climate_impact_area_id: data.tagsData.climate.component?.id ?? null,
      nutrition_tag_level_id: data.tagsData.nutrition.tag?.id ?? null,
      nutrition_impact_area_id: data.tagsData.nutrition.component?.id ?? null,
      environmental_biodiversity_tag_level_id:
        data.tagsData.environmental.tag?.id ?? null,
      environmental_biodiversity_impact_area_id:
        data.tagsData.environmental.component?.id ?? null,
      poverty_tag_level_id: data.tagsData.poverty.tag?.id ?? null,
      poverty_impact_area_id: data.tagsData.poverty.component?.id ?? null,
      geographic_scope_id: data.geographicScopeId,
      last_updated_by: data.userId,
      is_discontinued: data.is_discontinued,
      status_id: data.status,
    });
  }

  private async handleDiscontinuedOptions(
    resultId: number,
    dto: UpdateIpsrGeneralInformationDto,
    userId: number,
  ) {
    if (dto.is_discontinued) {
      await this._resultsInvestmentDiscontinuedOptionRepository.inactiveData(
        dto.discontinued_options.map(
          (el) => el.investment_discontinued_option_id,
        ),
        resultId,
        userId,
      );

      for (const option of dto.discontinued_options) {
        await this.upsertDiscontinuedOption(resultId, option, userId);
      }
    } else {
      await this._resultsInvestmentDiscontinuedOptionRepository.update(
        { result_id: resultId },
        {
          is_active: false,
          last_updated_by: userId,
        },
      );
    }
  }

  private async upsertDiscontinuedOption(
    resultId: number,
    option: { investment_discontinued_option_id: number; value: boolean; description?: string },
    userId: number,
  ) {
    const existing = await this._resultsInvestmentDiscontinuedOptionRepository.findOne(
      {
        where: {
          result_id: resultId,
          investment_discontinued_option_id:
            option.investment_discontinued_option_id,
        },
      },
    );

    if (existing) {
      await this._resultsInvestmentDiscontinuedOptionRepository.update(
        existing.results_investment_discontinued_option_id,
        {
          is_active: option.value,
          description: option?.description,
          last_updated_by: userId,
        },
      );
    } else {
      await this._resultsInvestmentDiscontinuedOptionRepository.save({
        result_id: resultId,
        investment_discontinued_option_id:
          option.investment_discontinued_option_id,
        description: option?.description,
        is_active: Boolean(option.value),
        created_by: userId,
        last_updated_by: userId,
      });
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
