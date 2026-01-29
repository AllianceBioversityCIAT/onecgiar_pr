import { NotificationDto } from "./create-socket.dto";

export class SendNotificationSocketDto {
    userId: string;
    notification: NotificationDto;
}