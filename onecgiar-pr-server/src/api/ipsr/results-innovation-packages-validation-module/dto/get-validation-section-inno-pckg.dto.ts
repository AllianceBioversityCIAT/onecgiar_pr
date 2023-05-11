export class GetValidationSectionInnoPckgDto {
    public sectionName: string;
    public validation!: string;
    public step: string;
}

export class GreenchecksResponse {
    response: {
        mainSection: {
            sectionName: string;
            validation: number | string;
        }[];
        stepSections: GetValidationSectionInnoPckgDto[];
        validResult: {
            validation: number;
        };
    };
    message: string;
    status: number;
}