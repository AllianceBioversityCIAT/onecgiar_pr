import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ResultsApiService } from '../../../../services/api/results-api.service';
import { SubNationalInterface } from '../../interfaces/subnational.interface';

@Component({
    selector: 'app-sub-geoscope',
    templateUrl: './sub-geoscope.component.html',
    styleUrls: ['./sub-geoscope.component.scss'],
    standalone: false
})
export class SubGeoscopeComponent implements OnInit {
  @Input() countryList: any[] = [];
  @Input() index: number;
  @Input() obj_country: any = { sub_national: [] };
  @Input() obj_countrySelected: any[] = [];
  @Input() name: string = '01';
  @Input() readOnly: boolean = false;
  @Output() changed = new EventEmitter<void>();
  public subNationList: any[] = [];
  public currentCountryId: number;
  public selectedSubNational: any[] = [];

  /**
   * P2-3647 — whether the catalogue for this country has actually arrived.
   *
   * The template used to decide everything from `subNationList.length` alone, which cannot tell
   * "this country has no sub-national levels" apart from "the list has not come back yet" or "the
   * request failed". Toggling the scope to Country and back DESTROYS this component and builds a
   * new one (`geoscope-management.component.html:78`, `*ngIf="body.geo_scope_id == 5"`), so after
   * every toggle the list is empty again and the screen stated, as a fact, that a country with 34
   * sub-national levels had none.
   */
  public subNationalStatus: 'loading' | 'loaded' | 'failed' = 'loading';

  constructor(private readonly _api: ResultsApiService) {}

  private getSubNational(isoAlpha2: string, f?: Function) {
    // A country without an ISO code cannot be looked up — asking anyway returns a catalogue for
    // `undefined` and the empty answer reads exactly like "this country has no levels".
    if (!isoAlpha2) {
      this.subNationalStatus = 'failed';
      return;
    }

    this.subNationalStatus = 'loading';
    this._api.GET_subNationalByIsoAlpha2(isoAlpha2).subscribe({
      next: ({ response }) => {
        this.subNationList = this.subNationalMapper(response);
        this.subNationalStatus = 'loaded';
      },
      error: () => {
        // Without this branch a failed request left the list empty forever, and the template
        // presented that emptiness as a statement about the country.
        this.subNationList = [];
        this.subNationalStatus = 'failed';
      },
      complete: () => {
        f?.();
      }
    });
  }

  deleteSubNational(index) {
    this.obj_country.sub_national.splice(index, 1);
    this.changed.emit();
  }

  deleteCountry(index) {
    this.obj_countrySelected.splice(index, 1);
    this.changed.emit();
  }

  onSubNationalChange(): void {
    this.changed.emit();
  }

  ngOnInit(): void {
    this.obj_country['sub_national'] = this.obj_country.sub_national || [];
    this.getSubNational(this.obj_country.iso_alpha_2, () => {
      this.obj_country.sub_national = this.obj_country.sub_national.map(el => {
        // P2-3647: keep whatever label the row already carried when the catalogue cannot supply
        // one. Overwriting it with `undefined` painted the chip through `[innerHtml]`, so a
        // selection that was still in the model rendered as an empty box — "it disappeared".
        const formatedName: string = this.subNationList.find(sn => sn.code === el.code)?.formatedName ?? el.formatedName;
        el = { ...el, formatedName };
        return el;
      });
    });
  }

  private subNationalMapper(item: SubNationalInterface[]): SubNationalInterface[] {
    const findAvalibleName = sn => {
      return sn?.name || sn?.local_name || sn?.romanization_system_name || `No name available`;
    };

    return item.map(sn => {
      const avalibleName = findAvalibleName(sn);
      const reduceName = sn.other_names?.reduce((acc, curr) => {
        const otherAvalibleName = findAvalibleName(curr);
        return acc ? `${acc}, ${otherAvalibleName}` : `${otherAvalibleName}`;
      }, '');

      let formatedName = `<strong>${avalibleName}</strong>`;
      if (reduceName) {
        formatedName += ` - <span class="select_item_description">${reduceName}</span>`;
      }
      return {
        ...sn,
        formatedName,
        avalibleName
      };
    });
  }
}
