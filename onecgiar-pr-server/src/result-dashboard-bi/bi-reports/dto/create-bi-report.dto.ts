export class CreateBiReportDto {
  report_name: string;

  report_title: string;

  report_description: string;

  report_id: string;

  dataset_id: string;

  group_id: string;

  is_active: boolean;

  has_rls_security: boolean;

  report_order: number;
}
