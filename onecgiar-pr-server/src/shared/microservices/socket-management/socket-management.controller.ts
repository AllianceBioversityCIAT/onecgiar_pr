import { Controller, Get } from "@nestjs/common";
import { SocketManagementService } from "./socket-management.service";
import { Payload, EventPattern } from "@nestjs/microservices";
import { SendNotificationSocketDto } from "./dto/send-notification-socket.dto";
import { SelfApp } from "../../broker/self.app";

@Controller('socket-management')
export class SocketManagementController {
    constructor(private readonly socketManagementService: SocketManagementService, private readonly selfApp: SelfApp) { }

    @EventPattern('send-notification')
    async sendNotification(@Payload() payload: SendNotificationSocketDto) {
        const { userId, notification } = payload;
        return this.socketManagementService.sendtoQueueNotification([userId], notification);
    }
}