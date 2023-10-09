import { Result } from '../../../api/results/entities/result.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Actions } from './enumAction.const';
export class CreateDynamodbLogDto {
  public result: Result;
  public moreInfo?: string;
  public action: Actions;
}
