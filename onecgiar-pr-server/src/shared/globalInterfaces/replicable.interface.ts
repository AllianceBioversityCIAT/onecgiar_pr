import { TokenDto } from './token.dto';

export interface ReplicableInterface<T> {
  replicable(config: ReplicableConfigInterface<T>): Promise<T | T[]>;
}

export interface ReplicableConfigInterface<T> {
  phase: number;
  user: TokenDto;
  new_result_id?: number;
  old_result_id?: number;
  predetermined_date?: Date;
  new_ipsr_id?: number;
  old_ipsr_id?: number;
  entity_id?: number;
  f?: {
    custonFunction?: (res: T | T[]) => T | T[];
    errorFunction?: (error: any) => void;
    completeFunction?: (res: T | T[]) => void;
  };
}

export interface ConfigCustomQueryInterface {
  findQuery: string;
  insertQuery: string;
  returnQuery: string;
}

export interface GetQueryConfigurationsInterface<T> {
  createQueries(
    config: ReplicableConfigInterface<T>,
  ): ConfigCustomQueryInterface;
}
