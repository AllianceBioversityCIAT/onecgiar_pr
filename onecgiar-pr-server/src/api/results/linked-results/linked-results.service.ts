import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateLinkedResultDto } from './dto/create-linked-result.dto';
import { UpdateLinkedResultDto } from './dto/update-linked-result.dto';
import { LinkedResultRepository } from './linked-results.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { Result } from '../entities/result.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { LinkedResult } from './entities/linked-result.entity';
import { VersionsService } from '../versions/versions.service';
import { Version } from '../versions/entities/version.entity';

@Injectable()
export class LinkedResultsService {
  constructor(
    private readonly _linkedResultRepository: LinkedResultRepository,
    private readonly _handlersError: HandlersError,
    private readonly _versionsService: VersionsService,
    private readonly _resultRepository: ResultRepository,
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

      const vTemp = await this._versionsService.findBaseVersion();
      if (vTemp.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: vTemp });
      }
      const version: Version = <Version>vTemp.response;

      let isExistsNew: number[] = [];
      let isExistsNewLegacy: string[] = [];
      createLinkedResultDto.links = createLinkedResultDto.links ?? [];
      createLinkedResultDto.legacy_link =
        createLinkedResultDto.legacy_link ?? [];
      const links: interfaceLinkResults[] = createLinkedResultDto.links;
      let legacyLinks: interfaceLinkResults[] =
        createLinkedResultDto.legacy_link;
      if (createLinkedResultDto?.links?.length) {
        const newLinks: LinkedResult[] = [];
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
            newLink.version_id = version.id;
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
            newLink.version_id = version.id;
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
      return {
        response: {},
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findAllLinksByResult(resultId: number) {
    try {
      const links = await this._linkedResultRepository.getLinkResultByIdResult(
        resultId,
      );

      return {
        response: {
          links: links.filter((el) => !!el.id),
          legacy_link: links.filter((el) => !el.id),
        },
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} linkedResult`;
  }

  update(id: number, updateLinkedResultDto: UpdateLinkedResultDto) {
    return `This action updates a #${id} linkedResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} linkedResult`;
  }
}

interface interfaceLinkResults {
  id?: number;
  legacy_link?: string;
}
