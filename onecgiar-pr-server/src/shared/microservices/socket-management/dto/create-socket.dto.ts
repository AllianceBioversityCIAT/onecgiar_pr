export class NotificationDto {
  title: string;
  desc: string;
  result: any;
  byUser?: {
    id: number | null;
    name: string | null;
    email: string | null;
  } | null;
}
