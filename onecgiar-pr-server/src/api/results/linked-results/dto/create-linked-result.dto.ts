export class CreateLinkedResultDto {
    public result_id!:number;
    public links: interfaceLinkResults[];
}

interface interfaceLinkResults{
    id: number;
}
