import { Component, OnInit } from '@angular/core';
import { DataControlService } from '../../services/data-control.service';

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss'],
    standalone: false
})
export class BreadcrumbComponent {
  constructor(public dataControlSE: DataControlService) {}
}
