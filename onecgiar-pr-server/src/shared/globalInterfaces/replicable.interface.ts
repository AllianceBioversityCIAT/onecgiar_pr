import { TokenDto } from './token.dto';

export interface ReplicableInterface<T> {
  replicable(config: ReplicableConfigInterface<T>): Promise<T | T[]>;
}

export interface ReplicableConfigInterface<T> {
  phase: number;
  user: TokenDto;
  new_result_id?: number;
  old_result_id?: number;
  new_kp_id?: number;
  old_kp_id?: number;
  f?: {
    custonFunction?: (res: T | T[]) => T | T[];
    errorFunction?: (error: any) => void;
    completeFunction?: (res: T | T[]) => void;
  };
}
