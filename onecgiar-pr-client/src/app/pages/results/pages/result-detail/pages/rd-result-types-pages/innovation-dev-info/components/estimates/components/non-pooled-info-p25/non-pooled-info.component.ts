import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../../../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../../../../../../../../shared/services/global/institutions.service';

@Component({
  selector: 'app-non-pooled-info-p25',
  templateUrl: './non-pooled-info.component.html',
  styleUrls: ['./non-pooled-info.component.scss'],
  standalone: false
})
export class NonPooledInfoP25Component {
  @Input() body: any;
  visible = false;

  constructor(
    public institutionsSE: InstitutionsService,
    public centersSE: CentersService,
    public api: ApiService
  ) {}
}
