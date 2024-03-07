import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SectionHeaderComponent } from '../../components/section-header/section-header.component';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-innovation-package-list-content',
  standalone: true,
  templateUrl: './innovation-package-list-content.component.html',
  styleUrls: ['./innovation-package-list-content.component.scss'],
  imports: [
    CommonModule,
    SectionHeaderComponent,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ]
})
export class InnovationPackageListContentComponent {}
