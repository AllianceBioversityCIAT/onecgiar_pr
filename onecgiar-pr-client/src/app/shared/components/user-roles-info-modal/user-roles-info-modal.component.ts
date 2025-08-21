import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { GlobalLinksService } from '../../services/variables/global-links.service';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-user-roles-info-modal',
  imports: [TooltipModule],
  standalone: true,
  templateUrl: './user-roles-info-modal.component.html',
  styleUrl: './user-roles-info-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserRolesInfoModalComponent {
  globalLinksSE = inject(GlobalLinksService);

  @Input() showTooltip = true;

  openInfoLink() {
    const w = window.innerWidth - window.innerWidth / 3;
    const h = window.innerHeight - window.innerHeight / 4;

    const top = window.screenY + (window.outerHeight - h) / 2.5;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const url = this.globalLinksSE.links.url_platform_information;

    window.open(url, 'Information center', `left=${left},top=${top},width=${w},height=${h}`);
  }
}
