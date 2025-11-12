import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import {
  BilateralResultTypeHandler,
  HandlerAfterCreateContext,
} from './bilateral-result-type-handler.interface';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { ResultsCapacityDevelopmentsRepository } from '../../results/summary/repositories/results-capacity-developments.repository';
import { CapdevsTermRepository } from '../../results/capdevs-terms/capdevs-terms.repository';
import { CapdevsDeliveryMethodRepository } from '../../results/capdevs-delivery-methods/capdevs-delivery-methods.repository';

@Injectable()
export class CapacityChangeBilateralHandler
  implements BilateralResultTypeHandler
{
  readonly resultType = ResultTypeEnum.CAPACITY_CHANGE;
  private readonly logger = new Logger(CapacityChangeBilateralHandler.name);
  private readonly capdevTermLabelToId = new Map<string, number>([
    ['phd', 1],
    ['ph.d.', 1],
    ['doctorate', 1],
    ['master', 2],
    ['masters', 2],
    ['short-term', 3],
    ['short term', 3],
    ['short', 3],
    ['long-term', 4],
    ['long term', 4],
    ['long', 4],
  ]);
  private readonly capdevDeliveryLabelToId = new Map<string, number>([
    ['virtual/online', 1],
    ['virtual / online', 1],
    ['online', 1],
    ['virtual', 1],
    ['in person', 2],
    ['in-person', 2],
    ['blended (in-person and virtual)', 3],
    ['blended', 3],
  ]);

  constructor(
    private readonly _resultsCapacityDevelopmentsRepository: ResultsCapacityDevelopmentsRepository,
    private readonly _capdevsTermRepository: CapdevsTermRepository,
    private readonly _capdevsDeliveryMethodRepository: CapdevsDeliveryMethodRepository,
  ) {}

  async afterCreate({
    bilateralDto,
    resultId,
    userId,
  }: HandlerAfterCreateContext): Promise<void> {
    if (bilateralDto.result_type_id !== ResultTypeEnum.CAPACITY_CHANGE) return;

    const capacitySharing = bilateralDto.capacity_sharing;
    if (!capacitySharing) {
      throw new BadRequestException(
        'capacity_sharing object is required for CAPACITY_CHANGE results.',
      );
    }

    const {
      number_people_trained,
      length_training,
      delivery_method,
    } = capacitySharing;

    if (!number_people_trained) {
      throw new BadRequestException(
        'number_people_trained is required inside capacity_sharing.',
      );
    }

    const capdevTermId = await this.resolveCapdevTermId(length_training);
    const deliveryMethodId =
      await this.resolveCapdevDeliveryMethodId(delivery_method);

    const capacityData = {
      male_using: number_people_trained.men ?? null,
      female_using: number_people_trained.women ?? null,
      non_binary_using: number_people_trained.non_binary ?? null,
      has_unkown_using: number_people_trained.unknown ?? null,
      capdev_term_id: capdevTermId,
      capdev_delivery_method_id: deliveryMethodId,
    };

    const existing =
      await this._resultsCapacityDevelopmentsRepository.capDevExists(resultId);

    if (existing) {
      await this._resultsCapacityDevelopmentsRepository.save({
        ...existing,
        ...capacityData,
        last_updated_by: userId,
      });
      this.logger.debug(
        `Updated capacity sharing data for result ${resultId} (CAPACITY_CHANGE).`,
      );
      return;
    }

    await this._resultsCapacityDevelopmentsRepository.save(
      this._resultsCapacityDevelopmentsRepository.create({
        result_id: resultId,
        created_by: userId,
        is_active: true,
        ...capacityData,
      }),
    );
    this.logger.log(
      `Stored capacity sharing data for result ${resultId} (CAPACITY_CHANGE).`,
    );
  }

  private normalizeCapacityLabel(value?: string | null) {
    return value
      ? value
          .trim()
          .toLowerCase()
          .replace(/\s*\/\s*/g, '/')
          .replace(/\s+/g, ' ')
      : '';
  }

  private async resolveCapdevTermId(lengthTraining: string) {
    if (!lengthTraining) {
      throw new BadRequestException(
        'length_training is required inside capacity_sharing.',
      );
    }
    const normalized = this.normalizeCapacityLabel(lengthTraining);
    const mappedId = this.capdevTermLabelToId.get(normalized);
    if (!mappedId) {
      throw new BadRequestException(
        `Unsupported length_training value "${lengthTraining}".`,
      );
    }
    const term = await this._capdevsTermRepository.findOne({
      where: { capdev_term_id: mappedId },
    });
    if (!term) {
      throw new NotFoundException(
        `Capdev term not found for value "${lengthTraining}".`,
      );
    }
    return term.capdev_term_id;
  }

  private async resolveCapdevDeliveryMethodId(deliveryMethod: string) {
    if (!deliveryMethod) {
      throw new BadRequestException(
        'delivery_method is required inside capacity_sharing.',
      );
    }
    const normalized = this.normalizeCapacityLabel(deliveryMethod);
    const mappedId = this.capdevDeliveryLabelToId.get(normalized);
    if (!mappedId) {
      throw new BadRequestException(
        `Unsupported delivery_method value "${deliveryMethod}".`,
      );
    }
    const record = await this._capdevsDeliveryMethodRepository.findOne({
      where: { capdev_delivery_method_id: mappedId },
    });
    if (!record) {
      throw new NotFoundException(
        `Capdev delivery method not found for value "${deliveryMethod}".`,
      );
    }
    return record.capdev_delivery_method_id;
  }
}
