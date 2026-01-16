import { CreateBilateralDto } from '../dto/create-bilateral.dto';
import { Result } from '../../results/entities/result.entity';

export interface HandlerInitializeContext {
  bilateralDto: CreateBilateralDto;
  userId: number;
  submittedUserId: number;
  version: any;
  year: any;
  lastCode: number;
}

export interface HandlerInitializeResult {
  resultHeader: Result;
  isDuplicate?: boolean;
}

export interface HandlerAfterCreateContext {
  resultId: number;
  userId: number;
  isDuplicateResult?: boolean;
  bilateralDto: CreateBilateralDto;
}

export interface BilateralResultTypeHandler {
  readonly resultType: number;

  initializeResultHeader?(
    context: HandlerInitializeContext,
  ): Promise<HandlerInitializeResult | null>;

  afterCreate?(context: HandlerAfterCreateContext): Promise<void>;
}
