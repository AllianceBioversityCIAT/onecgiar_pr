import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../../../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../../../../../../../../shared/services/global/institutions.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { PrSelectComponent } from '../../../../../../../../../../../custom-fields/pr-select/pr-select.component';
import { PrInputComponent } from '../../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrButtonComponent } from '../../../../../../../../../../../custom-fields/pr-button/pr-button.component';

@Component({
  selector: 'app-non-pooled-info',
  standalone: true,
  templateUrl: './non-pooled-info.component.html',
  styleUrls: ['./non-pooled-info.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    PrSelectComponent,
    PrInputComponent,
    PrButtonComponent
  ]
})
export class NonPooledInfoComponent implements OnInit {
  @Input() body: any;
  visible = false;

  constructor(
    public institutionsSE: InstitutionsService,
    public centersSE: CentersService,
    public api: ApiService
  ) {}

  ngOnInit(): void {}
}
