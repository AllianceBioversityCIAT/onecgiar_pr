import { CreateBilateralDto } from '../dto/create-bilateral.dto';
import { Result } from '../../results/entities/result.entity';

export interface HandlerInitializeContext {
  bilateralDto: CreateBilateralDto;
  userId: number;
  submittedUserId: number;
  version: any;
  year: any;
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

/**
 * Runs before the ingest transaction starts. This is intentionally separate from
 * `afterCreate`: external bilateral payloads must fail their MDS gate before a
 * Pending Review result (or any of its linked rows) can be written.
 */
export interface HandlerBeforeCreateContext {
  bilateralDto: CreateBilateralDto;
}

export interface BilateralResultTypeHandler {
  readonly resultType: number;

  initializeResultHeader?(
    context: HandlerInitializeContext,
  ): Promise<HandlerInitializeResult | null>;

  validateBeforeCreate?(context: HandlerBeforeCreateContext): Promise<void>;

  afterCreate?(context: HandlerAfterCreateContext): Promise<void>;
}
