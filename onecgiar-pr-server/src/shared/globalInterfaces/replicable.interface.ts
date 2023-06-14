import { TokenDto } from './token.dto';

export interface ReplicableInterface<T> {
  replicable(
    phase: number,
    user: TokenDto,
    new_result_id: number,
    old_result_id?: number,
    f?: {
      custonFunction?: (res: T) => T;
      errorFunction?: (error: any) => void;
      completeFunction?: (res: T) => void;
    },
  ): Promise<T>;
}
