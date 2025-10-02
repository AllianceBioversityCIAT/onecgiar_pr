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
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  entityAowService = inject(EntityAowService);

  isAOWTreeOpen = signal<boolean>(true);

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.entityAowService.entityId.set(params['entityId']);
    });

    if (!this.entityAowService.entityAows().length) {
      this.entityAowService.getClarisaGlobalUnits();
    }
  }

  getCurrentRoute(): string {
    const currentUrl = this.router.url;
    const aowIndex = currentUrl.indexOf('/aow/');
    const subPath = aowIndex !== -1 ? currentUrl.substring(aowIndex) : currentUrl;

    const found = this.entityAowService.sideBarItems().find(item => item.itemLink === subPath);
    if (found) {
      return found.label;
    }
    for (const item of this.entityAowService.sideBarItems()) {
      if (item.isTree && Array.isArray(item.items)) {
        const subItem = item.items.find((sub: any) => sub.itemLink === subPath);
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
