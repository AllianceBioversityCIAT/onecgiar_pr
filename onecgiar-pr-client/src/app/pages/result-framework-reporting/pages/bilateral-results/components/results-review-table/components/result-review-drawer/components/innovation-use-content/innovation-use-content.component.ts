import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilateralResultDetail, BilateralInnovationUseResponse } from '../../result-review-drawer.interfaces';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { YmzListStructureItemModule } from '../../../../../../../../../../shared/directives/ymz-list-structure-item/ymz-list-structure-item.module';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-innovation-use-content',
  imports: [CommonModule, FormsModule, CustomFieldsModule, YmzListStructureItemModule],
  templateUrl: './innovation-use-content.component.html',
  styleUrl: '../../result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InnovationUseContentComponent implements OnInit {
  @Input() disabled: boolean = false;

  @Input() set resultDetail(value: BilateralResultDetail) {
    if (!value) {
      this._resultDetail = value;
      return;
    }
    const rtr = (value as any).resultTypeResponse;
    const iuBody = this.getInnovationUseBodyFromResponse(rtr);
    if (!iuBody) {
      (value as any).resultTypeResponse = [this.defaultInnovationUseBody()];
    } else {
      if (!Array.isArray(rtr) || rtr.length === 0) {
        (value as any).resultTypeResponse = [iuBody];
      }
      if (!Array.isArray(iuBody.actors)) iuBody.actors = [];
      if (!Array.isArray(iuBody.organizations)) iuBody.organizations = [];
      if (!Array.isArray(iuBody.measures)) iuBody.measures = [];
      if (!Array.isArray(iuBody.investment_partners)) iuBody.investment_partners = [];
    }
    this._resultDetail = value;
    this.cdr.markForCheck();
  }
  get resultDetail(): BilateralResultDetail {
    return this._resultDetail;
  }
  private _resultDetail: BilateralResultDetail;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly api = inject(ApiService);

  actorsTypeList: { actor_type_id: number | string; name: string }[] = [];

  ngOnInit(): void {
    this.api.resultsSE.GETAllActorsTypes().subscribe({
      next: ({ response }) => {
        this.actorsTypeList = response ?? [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.actorsTypeList = [];
        this.cdr.markForCheck();
      }
    });
  }

  private getInnovationUseBodyFromResponse(r: any): BilateralInnovationUseResponse | null {
    if (r == null) return null;
    if (Array.isArray(r) && r.length > 0) {
      const first = r[0];
      if (first && typeof first === 'object' && this.isInnovationUseShape(first)) {
        return first;
      }
      return null;
    }
    if (typeof r === 'object' && this.isInnovationUseShape(r)) {
      return r;
    }
    return null;
  }

  private isInnovationUseShape(obj: any): boolean {
    return obj != null && typeof obj === 'object' && ('actors' in obj || 'organizations' in obj || 'measures' in obj || 'investment_partners' in obj);
  }

  private defaultInnovationUseBody(): BilateralInnovationUseResponse {
    return {
      actors: [],
      organizations: [],
      measures: [],
      investment_partners: []
    };
  }

  get body(): BilateralInnovationUseResponse {
    const rtr = this._resultDetail && (this._resultDetail as any).resultTypeResponse;
    const iu = this.getInnovationUseBodyFromResponse(rtr);
    return iu ?? this.defaultInnovationUseBody();
  }

  actorTypeDescription(): string {
    return `<li>CGIAR follows the United Nations definition of 'youth' as those persons between the ages of 15 and 24 years</li>
    <li>If age disaggregation does not apply, then please apply a 50/50% rule in dividing women or men across the youth/non-youth category</li>
    <li>We are currently working to include broader diversity dimensions beyond male, female and youth, which will be implemented in future reporting periods.</li>`;
  }

  removeOther(actors: any[]): any[] {
    return actors?.filter(item => item?.actor_type_id !== 5 && item?.actor_type_id != null) ?? [];
  }

  cleanActor(actorItem: any): void {
    if (!actorItem) return;
    actorItem.women = null;
    actorItem.women_youth = null;
    actorItem.women_non_youth = null;
    actorItem.men = null;
    actorItem.men_youth = null;
    actorItem.men_non_youth = null;
    actorItem.how_many = null;
    this.cdr.markForCheck();
  }

  addActor(): void {
    this.body.actors = this.body.actors ?? [];
    this.body.actors.push({
      is_active: true,
      actor_type_id: null,
      sex_and_age_disaggregation: true,
      how_many: null,
      women: null,
      women_youth: null,
      men: null,
      men_youth: null,
      other_actor_type: null
    });
    this.cdr.markForCheck();
  }

  addOther(): void {
    this.body.measures = this.body.measures ?? [];
    this.body.measures.push({
      is_active: true,
      unit_of_measure: null,
      quantity: null
    });
    this.cdr.markForCheck();
  }

  hasElementsWithId(list: any[] | undefined, attr: string): boolean {
    if (!Array.isArray(list)) return false;
    if (this.disabled) {
      return list.some(item => item?.[attr]);
    }
    return list.some(item => item?.is_active !== false);
  }

  checkValueAlert(item: any): boolean {
    if (item?.is_determined) return true;
    if (item?.kind_cash != null && item?.kind_cash !== '') return true;
    return false;
  }

  onRadioChange(item: any): void {
    if (item) item.kind_cash = null;
    this.cdr.markForCheck();
  }

  onInputChange(item: any): void {
    if (item?.kind_cash) item.is_determined = null;
    this.cdr.markForCheck();
  }

  headerDescriptionsN3(): string {
    return `<ul>
    <li>Innovation use team works with partnersprojects to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each partner during the reporting period</li>
    <li>This concerns the investment of partner resources (in-cash and/or in-kind) that were not provided by CGIAR Science Program/Accelerator or projects</li>
    </ul>`;
  }
}
