import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  BilateralResultTypeHandler,
  HandlerAfterCreateContext,
} from './bilateral-result-type-handler.interface';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { ResultsPolicyChangesRepository } from '../../results/summary/repositories/results-policy-changes.repository';
import { ClarisaPolicyTypeRepository } from '../../../clarisa/clarisa-policy-types/clarisa-policy-types.repository';
import { ClarisaPolicyStageRepository } from '../../../clarisa/clarisa-policy-stages/clarisa-policy-stages.repository';

@Injectable()
export class PolicyChangeBilateralHandler
  implements BilateralResultTypeHandler
{
  readonly resultType = ResultTypeEnum.POLICY_CHANGE;
  private readonly logger = new Logger(PolicyChangeBilateralHandler.name);

  constructor(
    private readonly _resultsPolicyChangesRepository: ResultsPolicyChangesRepository,
    private readonly _clarisaPolicyTypeRepository: ClarisaPolicyTypeRepository,
    private readonly _clarisaPolicyStageRepository: ClarisaPolicyStageRepository,
  ) {}

  async afterCreate({
    bilateralDto,
    resultId,
    userId,
  }: HandlerAfterCreateContext): Promise<void> {
    if (bilateralDto.result_type_id !== ResultTypeEnum.POLICY_CHANGE) {
      return;
    }

    const policyChange = bilateralDto.policy_change;
    if (!policyChange) {
      throw new BadRequestException(
        'policy_change object is required for POLICY_CHANGE results.',
      );
    }

    if (!policyChange.policy_type) {
      throw new BadRequestException(
        'policy_type is required for POLICY_CHANGE results.',
      );
    }

    if (!policyChange.policy_stage) {
      throw new BadRequestException(
        'policy_stage is required for POLICY_CHANGE results.',
      );
    }

    if (
      !policyChange.implementing_organization ||
      policyChange.implementing_organization.length === 0
    ) {
      throw new BadRequestException(
        'implementing_organization array is required and must have at least one item for POLICY_CHANGE results.',
      );
    }

    const policyTypeId = await this.resolvePolicyTypeId(
      policyChange.policy_type,
    );
    const policyStageId = await this.resolvePolicyStageId(
      policyChange.policy_stage,
    );

    // Validate special requirements for policy type id = 1
    let statusAmount: string | null = null;
    let amount: number | null = null;

    if (policyTypeId === 1) {
      if (!policyChange.policy_type.status_amount) {
        throw new BadRequestException(
          'status_amount is required when policy_type id is 1.',
        );
      }
      if (
        policyChange.policy_type.amount === undefined ||
        policyChange.policy_type.amount === null
      ) {
        throw new BadRequestException(
          'amount is required when policy_type id is 1.',
        );
      }

      statusAmount = await this.resolveStatusAmount(
        policyChange.policy_type.status_amount,
      );
      amount = policyChange.policy_type.amount;
    }

    const existing = await this._resultsPolicyChangesRepository.findOne({
      where: { result_id: resultId },
    });

    if (existing) {
      existing.policy_type_id = policyTypeId;
      existing.policy_stage_id = policyStageId;
      existing.status_amount = statusAmount;
      existing.amount = amount;
      existing.last_updated_by = userId;
      await this._resultsPolicyChangesRepository.save(existing);
      this.logger.debug(`Updated policy change data for result ${resultId}.`);
      return;
    }

    const newRecord = this._resultsPolicyChangesRepository.create({
      result_id: resultId,
      created_by: userId,
      is_active: true,
      policy_type_id: policyTypeId,
      policy_stage_id: policyStageId,
      status_amount: statusAmount,
      amount: amount,
      linked_innovation_dev: false,
      linked_innovation_use: false,
    });
    await this._resultsPolicyChangesRepository.save(newRecord);
    this.logger.log(`Stored policy change data for result ${resultId}.`);
  }

  private async resolvePolicyTypeId(policyType?: {
    id?: number;
    name?: string;
  }): Promise<number> {
    if (!policyType) {
      throw new BadRequestException('policy_type is required.');
    }

    if (policyType.id !== undefined && policyType.id !== null) {
      const found = await this._clarisaPolicyTypeRepository.findOne({
        where: { id: policyType.id },
      });
      if (!found) {
        throw new BadRequestException(
          `Invalid policy_type id: ${policyType.id}. Please provide a valid policy type ID.`,
        );
      }
      return found.id;
    }

    if (policyType.name) {
      const normalized = policyType.name.trim().toLowerCase();
      const found = await this._clarisaPolicyTypeRepository
        .createQueryBuilder('pt')
        .where('LOWER(pt.name) = :name', { name: normalized })
        .getOne();
      if (!found) {
        throw new BadRequestException(
          `Invalid policy_type name: "${policyType.name}". Please provide a valid policy type name.`,
        );
      }
      return found.id;
    }

    throw new BadRequestException(
      'policy_type must provide either id (number) or name (string).',
    );
  }

  private async resolvePolicyStageId(policyStage?: {
    id?: number;
    name?: string;
  }): Promise<number> {
    if (!policyStage) {
      throw new BadRequestException('policy_stage is required.');
    }

    if (policyStage.id !== undefined && policyStage.id !== null) {
      const found = await this._clarisaPolicyStageRepository.findOne({
        where: { id: policyStage.id },
      });
      if (!found) {
        throw new BadRequestException(
          `Invalid policy_stage id: ${policyStage.id}. Please provide a valid policy stage ID.`,
        );
      }
      return found.id;
    }

    if (policyStage.name) {
      const normalized = policyStage.name.trim().toLowerCase();
      const found = await this._clarisaPolicyStageRepository
        .createQueryBuilder('ps')
        .where('LOWER(ps.name) = :name', { name: normalized })
        .getOne();
      if (!found) {
        throw new BadRequestException(
          `Invalid policy_stage name: "${policyStage.name}". Please provide a valid policy stage name.`,
        );
      }
      return found.id;
    }

    throw new BadRequestException(
      'policy_stage must provide either id (number) or name (string).',
    );
  }

  private async resolveStatusAmount(statusAmount?: {
    id?: number;
    name?: string;
  }): Promise<string> {
    if (!statusAmount) {
      throw new BadRequestException('status_amount is required.');
    }

    if (statusAmount.id !== undefined && statusAmount.id !== null) {
      return statusAmount.id.toString();
    }

    if (statusAmount.name) {
      return statusAmount.name;
    }

    throw new BadRequestException(
      'status_amount must provide either id (number) or name (string).',
    );
  }
}
