import { HttpStatus, Injectable } from '@nestjs/common';
import { ResultRepository } from '../../../../results/result.repository';
import { CreateResultFromFrameworkCommand } from './create-result-from-framework.command';
import { CreateFrameworkResultEntityService } from './create-framework-result-entity.service';
import { LinkFrameworkResultTocService } from './link-framework-result-toc.service';
import { ApplyFrameworkResultAssociationsService } from './apply-framework-result-associations.service';
import { throwServiceError } from '../../../../../shared/utils/service-error.util';


@Injectable()
export class CreateResultFromFrameworkHandler {
  constructor(
    private readonly _createFrameworkResultEntityService: CreateFrameworkResultEntityService,
    private readonly _linkFrameworkResultTocService: LinkFrameworkResultTocService,
    private readonly _applyFrameworkResultAssociationsService: ApplyFrameworkResultAssociationsService,
    private readonly _resultRepository: ResultRepository,
  ) {}

  async execute(command: CreateResultFromFrameworkCommand) {
    const { payload, user } = command;

    const { createdResultId, knowledgeProductResponse, initiativeId } =
      await this._createFrameworkResultEntityService.execute(payload, user);

    const resultSummary =
      await this._resultRepository.getResultById(createdResultId);

    if (!resultSummary) {
      throwServiceError(
        'The result could not be retrieved after creation.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const primaryTocRecordId =
      await this._linkFrameworkResultTocService.execute(
        payload,
        user,
        createdResultId,
        initiativeId,
      );

    await this._applyFrameworkResultAssociationsService.execute(
      payload,
      user,
      createdResultId,
    );

    return {
      response: {
        result: resultSummary,
        knowledgeProduct: knowledgeProductResponse ?? null,
        tocResultLinkId: primaryTocRecordId,
      },
      message: 'Result created successfully through the reporting workflow.',
      status: HttpStatus.CREATED,
    };
  }
}
