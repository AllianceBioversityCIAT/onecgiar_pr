export class CreateClarisaConnectionDto {
  public name: string;
  public acronym: string;
  public institutionTypeCode: number;
  public hqCountryIso: string;
  public websiteLink: string;
  public requestSource: string;
  public misAcronym?: string = 'PRMS';
  public externalUserMail?: string;
  public externalUserName?: string;
  public externalUserComments: string;
  public platformUrl: string;
}
