export class EmbedCredentialsDTO {
  embed_token: string;
  report: ReportInformation;
}

export class BodyPowerBiDTO {
  id: string;
}

export class ReportInformation {
  id: number;
  report_id: string;
  name: string;
  title: string;
  description: string;
  embed_url: string;
  order: number;
  hasFullScreen: boolean;
}
