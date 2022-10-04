export class FullResultsRequestDto {
    public id: number;
    public title: string;
    public reported_year: string;
    public result_type: string;
    public created_date: Date;
    public result_level_name: string;
    public submitter: string;
    public status: number;
    public status_name: string;
}
