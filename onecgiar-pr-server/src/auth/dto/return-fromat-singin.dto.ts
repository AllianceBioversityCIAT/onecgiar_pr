import { retunFormatService } from "src/shared/extendsGlobalDTO/retunServices.dto";

export class returnFormatSingin extends retunFormatService{
    public response: retunrFormatSinginInterface;
}

interface retunrFormatSinginInterface{
    valid: boolean;
    token?: string | null;
    user?: userJwtInterface;
}

interface userJwtInterface{
    id: number;
    user_name: string;
    email: string;
}