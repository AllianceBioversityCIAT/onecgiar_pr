import { Component, OnInit } from '@angular/core';
import { PusherService } from '../../../../../../shared/services/pusher.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-no-edit-container',
  standalone: true,
  templateUrl: './no-edit-container.component.html',
  styleUrls: ['./no-edit-container.component.scss'],
  imports: [CommonModule]
})
export class NoEditContainerComponent {
  constructor(public pusherSE: PusherService) {}
}
