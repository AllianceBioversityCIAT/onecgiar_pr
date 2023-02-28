export class  LogsSchemaDto{
    public id: number;
    public action: string;
    public user: number;
    public userFirstName?: string;
    public userLastName?: string;
    public onResultId: number;
    public onResultCode: number;
    public moreInfo?: string;
}