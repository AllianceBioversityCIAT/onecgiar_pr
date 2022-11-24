export class CreateLinkedResultDto {
    public result_id!:number;
    public links: interfaceLinkResults[];
    public legacy_link: interfaceLinkResults[];
}

interface interfaceLinkResults{
    id?: number;
    legacy_link?: string;
}
