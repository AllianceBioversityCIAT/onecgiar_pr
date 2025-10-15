import { HttpStatus, Injectable } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { InstitutionRoleEnum } from '../../results/results_by_institutions/entities/institution_role.enum';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultsTocResultsService } from '../../results/results-toc-results/results-toc-results.service';
import { ResultsByInstitutionsService } from '../../results/results_by_institutions/results_by_institutions.service';
import { CreateResultsTocResultV2Dto } from '../../results/results-toc-results/dto/create-results-toc-result-v2.dto';
import { SavePartnersV2Dto } from '../../results/results_by_institutions/dto/save-partners-v2.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UpdateContributorsPartnersDto } from './dto/update-contributors-partners.dto';

@Injectable()
export class ContributorsPartnersService {
  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _handlersError: HandlersError,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _resultsBilateralRepository: ResultsByProjectsRepository,
    private readonly _resultsTocResultsService: ResultsTocResultsService,
    private readonly _resultsByInstitutionsService: ResultsByInstitutionsService,
  ) {}

  async getContributorsPartnersByResultId(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const resultInit =
        await this._resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );

      if (!result?.id || !resultInit?.id) {
        throw {
          response: { resultId },
          message: 'Result or Initiative not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const [conInit, conPending] = await Promise.all([
        this._resultByInitiativesRepository.getContributorInitiativeByResult(
          resultId,
        ),
        this._resultByInitiativesRepository.getPendingInit(resultId),
      ]);

      const contributingInitiatives = {
        accepted_contributing_initiatives: conInit,
        pending_contributing_initiatives: conPending,
      };

      const institutionsData = await this._resultByIntitutionsRepository.find({
        where: {
          result_id: resultId,
          is_active: true,
          institution_roles_id: InstitutionRoleEnum.PARTNER,
        },
        relations: {
          delivery: true,
          obj_institutions: { obj_institution_type_code: true },
        },
        order: { id: 'ASC' },
      });

      const institutions = institutionsData.map((inst) => ({
        id: inst.id,
        deliveries: inst.delivery.filter((d) => d.is_active),
        institution: inst.obj_institutions
          ? {
              name: inst.obj_institutions.name,
              website_link: inst.obj_institutions.website_link,
              type: inst.obj_institutions.obj_institution_type_code?.name,
            }
          : null,
      }));

      const contributingCenters =
        await this._resultsCenterRepository.getAllResultsCenterByResultId(
          resultId,
        );

      const bilateralProjects =
        await this._resultsBilateralRepository.findResultsByProjectsByResultId(
          resultId,
        );

      console.log(bilateralProjects);

      return {
        response: {
          result_id: resultId,
          result_code: result.result_code,
          title: result.title,
          level_id: result.result_level_id,
          owner_initiative: resultInit,
          contributing_initiatives: contributingInitiatives,
          institutions,
          contributing_center: contributingCenters,
          bilateral_projects: bilateralProjects,
          no_applicable_partner: !!result.no_applicable_partner,
          is_lead_by_partner: !!result.is_lead_by_partner,
        },
        message: 'Contributors and Partners fetched successfully (P25)',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async updateTocMappingV2(
    resultId: number,
    dto: CreateResultsTocResultV2Dto,
    user: TokenDto,
  ) {
    dto.result_id = resultId;
    return this._resultsTocResultsService.createTocMappingV2(dto, user);
  }

  async updatePartnersV2(
    resultId: number,
    dto: SavePartnersV2Dto,
    user: TokenDto,
  ) {
    dto.result_id = resultId;
    return this._resultsByInstitutionsService.savePartnersInstitutionsByResultV2(
      dto,
      user,
    );
  }

  async updateContributorsAndPartners(
    resultId: number,
    payload: UpdateContributorsPartnersDto,
    user: TokenDto,
  ) {
    try {
      if (!payload?.toc_mapping && !payload?.partners) {
        return {
          response: {},
          message: 'No payload provided to update.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const response: Record<string, any> = {};
      const statuses: number[] = [];
      const messages: string[] = [];

      if (payload.toc_mapping) {
        const tocRes = await this.updateTocMappingV2(
          resultId,
          payload.toc_mapping,
          user,
        );
        response['toc_mapping'] = tocRes.response;
        statuses.push(tocRes.status ?? HttpStatus.OK);
        if (tocRes.message) messages.push(tocRes.message);
      }

      if (payload.partners) {
        const partnersRes = await this.updatePartnersV2(
          resultId,
          payload.partners,
          user,
        );
        response['partners'] = partnersRes.response;
        statuses.push(partnersRes.status ?? HttpStatus.OK);
        if (partnersRes.message) messages.push(partnersRes.message);
      }

      const status = statuses.length
        ? statuses.reduce((max, curr) => (curr > max ? curr : max), statuses[0])
        : HttpStatus.OK;

      return {
        response,
        message: messages.join(' | ') || 'Contributors and partners updated.',
        status,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
