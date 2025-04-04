import { Component, inject } from '@angular/core';
import { WhatsNewService } from './services/whats-new.service';

@Component({
  selector: 'app-whats-new',
  templateUrl: './whats-new.component.html',
  styleUrl: './whats-new.component.scss'
})
export class WhatsNewComponent {
  whatsNewService = inject(WhatsNewService);

  ngOnInit() {
    this.whatsNewService.getWhatsNew();
  }
}
