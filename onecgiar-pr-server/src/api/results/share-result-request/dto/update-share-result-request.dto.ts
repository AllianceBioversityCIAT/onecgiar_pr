import { ShareResultRequest } from '../entities/share-result-request.entity';


export class UpdateShareResultRequestDto {
    public isToc: boolean;
    public request: ShareResultRequest[];
}
