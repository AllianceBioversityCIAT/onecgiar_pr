import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Actions } from './enumAction.const';
export class CreateDynamodbLogDto {
    public onResultCode: number;
    public moreInfo?: string;
    public action: Actions;
}
