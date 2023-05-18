import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-sub-geoscope',
  templateUrl: './sub-geoscope.component.html',
  styleUrls: ['./sub-geoscope.component.scss']
})
export class SubGeoscopeComponent implements OnInit {
  @Input() body: any;
  @Input() index: any;
  countrySelected:any;
  subNationalOne:any = [];
  subNationalOneSelected = null;
  subNationalTwo:any = [];
  subNationalTwoSelected = null;
  @Output() selectOptionEvent = new EventEmitter();
  showNationalLevelSelect:boolean = true;
  showNationalLevelTwoSelect:boolean = true;
  constructor(public api: ApiService) { }

  ngOnInit(): void {
    console.log(this.body);
    
  }

  getSubNationalLevelOne(index){
    this.subNationalOne = []
    let isoAlpha = this.body.filter((resp) => this.countrySelected == resp.id)[0]['iso_alpha_2'];
    console.log(isoAlpha);
    this.api.resultsSE.getSubNationalLevelOne(isoAlpha).subscribe((resp) => {
      this.subNationalOne = resp['response']
      console.log(resp);
    })
    this.subNationalOneSelected = null;
    this.showNationalLevelSelect = false;
    setTimeout(() => {
      this.showNationalLevelSelect = true;
    }, 300);
  }

  getSSubNationalLevelTwo(index){
    this.subNationalTwo = []
    let isoAlpha = this.body.filter((resp) => this.countrySelected == resp.id)[0]['iso_alpha_2'];
    let adminCode = this.subNationalOne.filter((resp) => this.subNationalOneSelected == resp.geonameId)[0]['adminCode1'];
    this.api.resultsSE.getSubNationalLevelTwo(isoAlpha,adminCode).subscribe((resp) => {
    this.subNationalTwo = resp['response']
      console.log(resp);
    })

    this.subNationalTwoSelected = null;
    this.showNationalLevelTwoSelect = false;
    setTimeout(() => {
      this.showNationalLevelTwoSelect = true;
    }, 300);
   
    
  }

  delete(index){
    this.selectOptionEvent.emit(index);
    this.body.filter((resp) => this.countrySelected == resp.id)[0]['result_countries_sub_national'].splice(index, 1);
    console.log(this.body);
    
  }


  selectSubLevelTwo(index){
    let subContriesSave:any[] = this.body.filter((resp) => this.countrySelected == resp.id)[0]['result_countries_sub_national'];
    let infoSublevel = this.subNationalTwo.filter((resp) => this.subNationalTwoSelected == resp.geonameId)[0];
    let infoSublevelOne = this.subNationalOne.filter((resp) => this.subNationalOneSelected == resp.geonameId)[0];
    if(subContriesSave.length >= index + 1){
      const subCountriesSave = {
        sub_level_one_id: infoSublevelOne['geonameId'],
        sub_level_one_name:infoSublevelOne['name'],
        sub_level_two_id: infoSublevel['geonameId'],
        sub_level_two_name:infoSublevel['name']
      }
      subContriesSave[index] =  subCountriesSave;
    }else{
      const subCountriesSave = {
        sub_level_one_id: infoSublevelOne['geonameId'],
        sub_level_one_name:infoSublevelOne['name'],
        sub_level_two_id: infoSublevel['geonameId'],
        sub_level_two_name:infoSublevel['name']
      }
      subContriesSave.push(subCountriesSave);
    }
    console.log(this.body);
  }

}
