import { v4 as uuidv4 } from 'uuid';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Actions } from '../dto/enumAction.const';

export class  LogsModel{
    public id: number;
    public action: Actions;
    public userId: number;
    public userFirstName?: string;
    public userLastName?: string;
    public onResultCode: number;
    public onClass: string;
    public onMethod: string;
    public moreInfo?: string; 

    constructor(action: Actions, user: TokenDto, onResultCode: number, actionInfo?:{class?:string, method?: string}, moreInfo?: string){
        this.id = uuidv4();
        this.userId = user.id;
        this.userFirstName = user.first_name;
        this.userLastName = user.last_name;
        this.action = action;
        this.onResultCode = onResultCode;
        this.moreInfo = moreInfo;
        this.onClass = actionInfo.class;
        this.onMethod = actionInfo.method;
    }

    public getDataInsert(): any{
        return {
            id: {S: `${this.id}` },
            userId: {N: `${this.userId}` },
            userFirstName: {S: `${this.userFirstName}` },
            userLastName: {S: `${this.userLastName}` },
            action: {S: `${this.action}` },
            onClass: {S: `${this.onClass}`},
            onMethod: {S: `${this.onMethod}`},
            onResultCode: {N: `${this.onResultCode}` },
            moreInfo: {S: `${this.moreInfo}` },
            createDate: {S: `${new Date().toLocaleDateString()}`}
        }
    }
}