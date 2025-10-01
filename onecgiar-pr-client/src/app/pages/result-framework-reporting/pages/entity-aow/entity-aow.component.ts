import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EntityAowService } from './services/entity-aow.service';

@Component({
  selector: 'app-entity-aow',
  imports: [CommonModule, RouterModule],
  templateUrl: './entity-aow.component.html',
  styleUrl: './entity-aow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAowComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly entityAowService = inject(EntityAowService);

  sideBarItems = signal<any[]>([
    {
      label: 'All indicators',
      routerLink: `/aow/all`
    },
    {
      label: 'Unplanned results',
      routerLink: `/aow/unplanned`
    },
    {
      isTree: true,
      label: 'By AOW',
      isOpen: true,
      items: [
        {
          label: 'AOW01',
          routerLink: `/aow/AOW01`
        },
        {
          label: 'AOW02',
          routerLink: `/aow/AOW02`
        },
        {
          label: 'AOW03',
          routerLink: `/aow/AOW03`
        },
        {
          label: 'AOW04',
          routerLink: `/aow/AOW04`
        }
      ]
    }
  ]);

  isAOWTreeOpen = signal<boolean>(true);

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.entityAowService.entityId.set(params['entityId']);
    });
  }

  getCurrentRoute(): string {
    // Remove the initial url path (e.g., '/result-framework-reporting/entity-details/:entityId')
    // and match only the subpath (e.g., '/aow/all', '/aow/AOW01', etc.)
    const currentUrl = this.router.url;
    // Find the '/aow/...' part in the current URL
    const aowIndex = currentUrl.indexOf('/aow/');
    const subPath = aowIndex !== -1 ? currentUrl.substring(aowIndex) : currentUrl;

    const found = this.sideBarItems().find(item => item.routerLink === subPath);
    if (found) {
      return found.label;
    }
    for (const item of this.sideBarItems()) {
      if (item.isTree && Array.isArray(item.items)) {
        const subItem = item.items.find((sub: any) => sub.routerLink === subPath);
        if (subItem) {
          return subItem.label;
        }
      }
    }
    return '';
  }

  toggleAOWTree(item: any) {
    item.isOpen = !item.isOpen;
    this.isAOWTreeOpen.set(!this.isAOWTreeOpen());
  }
}
