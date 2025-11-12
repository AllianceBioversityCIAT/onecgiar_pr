import { Injectable } from '@nestjs/common';
import { BilateralResultTypeHandler } from './bilateral-result-type-handler.interface';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

@Injectable()
export class NoopBilateralHandler implements BilateralResultTypeHandler {
  readonly resultType = ResultTypeEnum.OTHER_OUTPUT;

  async initializeResultHeader() {
    return null;
  }

  async afterCreate() {
    return;
  }
}
