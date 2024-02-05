export class EmbedCredentialsDTO {
  embed_token: string;
  reportsInformation: ReportInformation[];
}

export class BodyPowerBiDTO {
  id: string;
}

export class ReportInformation {
  id: number;
  resport_id: string;
  name: string;
  title: string;
  description: string;
  embed_url: string;
  order: number;
  hasFullScreen: boolean;
}
