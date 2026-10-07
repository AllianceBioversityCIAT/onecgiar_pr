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

/**
 * @akili-spec bilateral/resubmit-rejected-result — RSB-T-3 / RSB-DD-1. What a handler needs to
 * check a payload WITHOUT a result row: the pure half of `afterCreate`.
 */
export interface HandlerResolveContext {
  bilateralDto: CreateBilateralDto;
}

export interface BilateralResultTypeHandler {
  readonly resultType: number;

  initializeResultHeader?(
    context: HandlerInitializeContext,
  ): Promise<HandlerInitializeResult | null>;

  validateBeforeCreate?(context: HandlerBeforeCreateContext): Promise<void>;

  /**
   * Every check and catalogue lookup `afterCreate` makes that needs no saved row (shape, levels,
   * actor types, numbers). Performs NO write. Returns what `afterCreate` persists, or `null` when
   * the payload is of another result type. `afterCreate` consumes it unchanged (same checks, same
   * order, same messages as the no-code create, `RSB-R-1`); the resubmission preflight calls it
   * before the first write (`RSB-R-8`, `UBC-T-3` attempt-1 FAIL R-B #1).
   */
  resolveAndValidate?(context: HandlerResolveContext): Promise<unknown | null>;

  afterCreate?(context: HandlerAfterCreateContext): Promise<void>;
}
