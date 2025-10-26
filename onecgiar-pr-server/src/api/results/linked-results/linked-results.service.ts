import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateLinkedResultDto } from './dto/create-linked-result.dto';
import { LinkedResultRepository } from './linked-results.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { Result } from '../entities/result.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { LinkedResult } from './entities/linked-result.entity';
import { VersionsService } from '../versions/versions.service';
import { ResultsPolicyChangesRepository } from '../summary/repositories/results-policy-changes.repository';

@Injectable()
export class LinkedResultsService {
  constructor(
    private readonly _linkedResultRepository: LinkedResultRepository,
    private readonly _handlersError: HandlersError,
    private readonly _versionsService: VersionsService,
    private readonly _resultRepository: ResultRepository,
    private readonly _policyChangeRepository: ResultsPolicyChangesRepository,
  ) {}
  async create(createLinkedResultDto: CreateLinkedResultDto, user: TokenDto) {
    try {
      if (!createLinkedResultDto?.result_id) {
        throw {
          response: {},
          message: 'Missing data in the request',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const result: Result = await this._resultRepository.getResultById(
        createLinkedResultDto.result_id,
      );
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const isExistsNew: number[] = [];
      const isExistsNewLegacy: string[] = [];
      createLinkedResultDto.links = createLinkedResultDto.links ?? [];
      createLinkedResultDto.legacy_link =
        createLinkedResultDto.legacy_link ?? [];
      const links: interfaceLinkResults[] = createLinkedResultDto.links;
      let legacyLinks: interfaceLinkResults[] =
        createLinkedResultDto.legacy_link;
      if (createLinkedResultDto?.links?.length) {
        const newLinks: LinkedResult[] = [];
        for (const i in links) {
          links[i].id = await this._linkedResultRepository.getMostUpDateResult(
            links[i]['result_code'],
          );
        }
        await this._linkedResultRepository.updateLink(
          createLinkedResultDto.result_id,
          links.map((e) => e.id),
          legacyLinks.map((e) => e.legacy_link),
          user.id,
          false,
        );
        for (let index = 0; index < links.length; index++) {
          const linkExists =
            await this._linkedResultRepository.getLinkResultByIdResultAndLinkId(
              result.id,
              links[index].id,
            );
          if (!linkExists && !isExistsNew.includes(links[index].id)) {
            const newLink = new LinkedResult();
            newLink.created_by = user.id;
            newLink.last_updated_by = user.id;
            newLink.origin_result_id = result.id;
            newLink.linked_results_id = links[index].id;
            isExistsNew.push(links[index].id);
            newLinks.push(newLink);
          }
        }
        await this._linkedResultRepository.save(newLinks);
      } else {
        await this._linkedResultRepository.updateLink(
          createLinkedResultDto.result_id,
          [],
          legacyLinks.map((e) => e.legacy_link),
          user.id,
          false,
        );
      }
      if (createLinkedResultDto?.legacy_link?.length) {
        const newLinks: LinkedResult[] = [];
        legacyLinks = legacyLinks.filter((el) => el.legacy_link?.length > 0);
        await this._linkedResultRepository.updateLink(
          createLinkedResultDto.result_id,
          links.map((e) => e.id),
          legacyLinks.map((e) => e.legacy_link),
          user.id,
          true,
        );
        for (let index = 0; index < legacyLinks.length; index++) {
          const linkExists =
            await this._linkedResultRepository.getLinkResultByIdResultAndLegacyLinkId(
              result.id,
              legacyLinks[index].legacy_link,
            );
          if (
            !linkExists &&
            !isExistsNewLegacy.includes(legacyLinks[index].legacy_link)
          ) {
            const newLink = new LinkedResult();
            newLink.created_by = user.id;
            newLink.last_updated_by = user.id;
            newLink.origin_result_id = result.id;
            newLink.legacy_link = legacyLinks[index].legacy_link;
            isExistsNewLegacy.push(legacyLinks[index].legacy_link);
            newLinks.push(newLink);
          }
        }
        await this._linkedResultRepository.save(newLinks);
      } else {
        await this._linkedResultRepository.updateLink(
          createLinkedResultDto.result_id,
          links.map((e) => e.id),
          [],
          user.id,
          true,
        );
      }

      if (result.result_type_id == 1) {
        await this._policyChangeRepository.update(
          { result_id: result.id },
          {
            linked_innovation_dev:
              createLinkedResultDto.linkedInnovation.linked_innovation_dev ||
              false,
            linked_innovation_use:
              createLinkedResultDto.linkedInnovation.linked_innovation_use ||
              false,
            last_updated_by: user.id,
            last_updated_date: new Date(),
          },
        );
      }

      return {
        response: 'Yasta',
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findAllLinksByResult(resultId: number) {
    try {
      const links =
        await this._linkedResultRepository.getLinkResultByIdResult(resultId);

      const result: Result =
        await this._resultRepository.getResultById(resultId);

      let linkedInnovation: any = null;
      if (result.result_type_id == 1) {
        linkedInnovation = await this._policyChangeRepository.findOne({
          where: { result_id: result.id },
          select: ['linked_innovation_dev', 'linked_innovation_use'],
        });
      }

      return {
        response: {
          links: links.filter((el) => !!el.id),
          legacy_link: links.filter((el) => !el.id),
          linkedInnovation: linkedInnovation
            ? linkedInnovation
            : {
                linked_innovation_dev: false,
                linked_innovation_use: false,
              },
        },
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async createForInnovationUse(
    result_id: number,
    linked_results: number[],
    user: TokenDto,
  ) {
    try {
      const result: Result = await this._resultRepository.getResultById(result_id);
      if (!result) {
        throw {
          response: {},
          message: 'Result not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      // Normalizamos el array de entrada
      const links: number[] = linked_results ?? [];

      if (links.length > 0) {
        const newLinks: LinkedResult[] = [];
        const isExistsNew: number[] = [];

        for (const linkId of links) {
          const linkExists =
            await this._linkedResultRepository.getLinkResultByIdResultAndLinkId(
              result.id,
              linkId,
            );

          if (!linkExists && !isExistsNew.includes(linkId)) {
            const newLink = new LinkedResult();
            newLink.created_by = user.id;
            newLink.last_updated_by = user.id;
            newLink.origin_result_id = result.id;
            newLink.linked_results_id = linkId;
            newLink.is_active = true;
            newLinks.push(newLink);
            isExistsNew.push(linkId);
          }
        }

        if (newLinks.length > 0) {
          await this._linkedResultRepository.save(newLinks);
        }

        // Actualizamos el estado de los links (activar los enviados, desactivar los que ya no están)
        await this._linkedResultRepository.updateLink(
          result_id,
          links,
          [],
          user.id,
          true,
        );
      } else {
        // Si no se envían links, desactivar todos los existentes
        await this._linkedResultRepository.update(
          { origin_result_id: result_id, is_active: true },
          { is_active: false, last_updated_by: user.id },
        );
      }

      return {
        response: 'Yasta',
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}

interface interfaceLinkResults {
  id?: number;
  legacy_link?: string;
}
