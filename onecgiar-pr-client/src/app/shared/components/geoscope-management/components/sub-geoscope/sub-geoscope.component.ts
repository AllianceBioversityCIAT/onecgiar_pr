import { Component, Input, OnInit } from '@angular/core';
import { ResultsApiService } from '../../../../services/api/results-api.service';
import { SubNationalInterface } from '../../interfaces/subnational.interface';

@Component({
  selector: 'app-sub-geoscope',
  templateUrl: './sub-geoscope.component.html',
  styleUrls: ['./sub-geoscope.component.scss']
})
export class SubGeoscopeComponent implements OnInit {
  @Input() countryList: any[] = [];
  @Input() index: number;
  @Input() obj_country: any = { sub_national: [] };
  @Input() obj_countrySelected: any[] = [];
  @Input() name: string = '01';
  @Input() readOnly: boolean = false;
  public subNationList: any[] = [];
  public currentCountryId: number;
  public selectedSubNational: any[] = [];

  constructor(private readonly _api: ResultsApiService) {}

  private getSubNational(isoAlpha2: string, f?: Function) {
    this._api.GET_subNationalByIsoAlpha2(isoAlpha2).subscribe({
      next: ({ response }) => {
        this.subNationList = this.subNationalMapper(response);
      },
      complete: () => {
        f?.();
      }
    });
  }

  subNationalLabelName() {
    return this.obj_country?.name ? `${this.obj_country.name}: Sub-Nationals` : `no existe`;
  }

  deleteSubNational(index) {
    this.obj_country.sub_national.splice(index, 1);
  }

  deleteCountry(index) {
    this.obj_countrySelected.splice(index, 1);
  }

  ngOnInit(): void {
    this.obj_country['sub_national'] = this.obj_country.sub_national || [];
    this.getSubNational(this.obj_country.iso_alpha_2, () => {
      this.obj_country.sub_national = this.obj_country.sub_national.map(el => {
        const formatedName: string = this.subNationList.find(sn => sn.code === el.code)?.formatedName;
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
