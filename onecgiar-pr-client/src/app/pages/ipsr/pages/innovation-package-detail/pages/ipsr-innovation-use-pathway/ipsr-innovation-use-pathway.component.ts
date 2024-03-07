import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SteperNavigationComponent } from '../../../../../../shared/components/steper-navigation/steper-navigation.component';

@Component({
  selector: 'app-ipsr-innovation-use-pathway',
  standalone: true,
  templateUrl: './ipsr-innovation-use-pathway.component.html',
  styleUrls: ['./ipsr-innovation-use-pathway.component.scss'],
  imports: [SteperNavigationComponent, RouterOutlet]
})
export class IpsrInnovationUsePathwayComponent implements OnInit {
  menuOptions: any[];

  ngOnInit() {
    this.menuOptions = [
      { path: 'step-1', routeName: 'Step 1', subName: 'Ambition' },
      { path: 'step-2', routeName: 'Step 2', subName: 'Package' },
      { path: 'step-3', routeName: 'Step 3', subName: 'Assess' },
      { path: 'step-4', routeName: 'Step 4', subName: 'Info' }
    ];
  }
}
