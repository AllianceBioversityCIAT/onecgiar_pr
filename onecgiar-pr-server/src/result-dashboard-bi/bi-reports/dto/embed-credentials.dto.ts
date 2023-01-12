export class EmbedCredentialsDTO {
    embed_token:string;

    embed_url_base: string;

    report_id: ReportBi[];

    group_id:string;

    config:string;

    tenant_id:string;
}

export class ReportBi{
    id:string;
}