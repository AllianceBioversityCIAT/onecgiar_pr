export class CreateLinkedResultDto {
    public result_id!:number;
    public links: interfaceLinkResults[];
    public legacy_link: interfaceLinkResults[];
    public linked_innovation_dev: boolean;
    public linked_innovation_use: boolean;
}

interface interfaceLinkResults{
    id?: number;
    legacy_link?: string;
}
