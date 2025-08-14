import { Component, OnInit } from '@angular/core';
import { PusherService } from '../../../../../../shared/services/pusher.service';

@Component({
    selector: 'app-no-edit-container',
    templateUrl: './no-edit-container.component.html',
    styleUrls: ['./no-edit-container.component.scss'],
    standalone: false
})
export class NoEditContainerComponent {
  constructor(public pusherSE: PusherService) {}
}
