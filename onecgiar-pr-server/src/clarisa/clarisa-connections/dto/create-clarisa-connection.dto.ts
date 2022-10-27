export class CreateClarisaConnectionDto {
    name: string;
    acronym: string;
    institutionTypeCode: number;
    hqCountryIso: string; 
    websiteLink: string;
    requestSource: string;
    misAcronym?: string = "PRMS"; 
    externalUserMail?: string;
    externalUserName?: string;
    externalUserComments: string;
}
