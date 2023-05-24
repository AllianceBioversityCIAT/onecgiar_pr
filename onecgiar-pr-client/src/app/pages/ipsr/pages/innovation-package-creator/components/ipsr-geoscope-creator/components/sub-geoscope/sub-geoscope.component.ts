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
  exitsSubLevelOne:boolean = true;
  exitsSubLevelTwo:boolean = true;
  nameCountry:string ;
  nameCountryTwo:string ;
  constructor(public api: ApiService) { }

  ngOnInit(): void {
    console.log(this.body);
    
  }

  getSubNationalLevelOne(index){
    this.subNationalOne = [];
    this.subNationalTwo =[];
    this.exitsSubLevelOne = true;
      
    let isoAlpha = this.body.filter((resp) => this.countrySelected == resp.id)[0]['iso_alpha_2'];
    console.log(isoAlpha);
    this.api.resultsSE.getSubNationalLevelOne(isoAlpha).subscribe((resp) => {
      this.subNationalOne = resp['response']
      console.log(resp);
      if (this.subNationalOne.length == 0) {
        this.exitsSubLevelOne = false;
        this.exitsSubLevelTwo = false;
        
        this.nameCountry = this.body.filter((resp) => this.countrySelected == resp.id)[0]['name'];
        this.nameCountryTwo = this.body.filter((resp) => this.countrySelected == resp.id)[0]['name'];
      }
    })
    this.subNationalOneSelected = null;
    this.showNationalLevelSelect = false;
    this.showNationalLevelTwoSelect = false;
    setTimeout(() => {
      this.showNationalLevelSelect = true;
      this.showNationalLevelTwoSelect = true;
    }, 300);
    console.log(this.countrySelected);
    
  }

  getSSubNationalLevelTwo(index){
    this.subNationalTwo = []
    this.exitsSubLevelTwo = true;
    let isoAlpha = this.body.filter((resp) => this.countrySelected == resp.id)[0]['iso_alpha_2'];
    let adminCode = this.subNationalOne.filter((resp) => this.subNationalOneSelected == resp.geonameId)[0]['adminCode1'];
    let infoSublevelOne = this.subNationalOne.filter((resp) => this.subNationalOneSelected == resp.geonameId)[0];
    let subContriesSave:any[] = this.body.filter((resp) => this.countrySelected == resp.id)[0]['result_countries_sub_national'];
    this.api.resultsSE.getSubNationalLevelTwo(isoAlpha,adminCode).subscribe((resp) => {
    this.subNationalTwo = resp['response']
      console.log(resp);
      if (this.subNationalTwo.length == 0) {
        this.exitsSubLevelTwo = false;
       
        this.nameCountryTwo =  infoSublevelOne['name'];
      }
    })
    if(subContriesSave.length >= index + 1){
      const subCountriesSave = {
        sub_level_one_id: infoSublevelOne['geonameId'],
        sub_level_one_name:infoSublevelOne['name'],
      }
      subContriesSave[index] =  subCountriesSave;
    }else{
      const subCountriesSave = {
        sub_level_one_id: infoSublevelOne['geonameId'],
        sub_level_one_name:infoSublevelOne['name'],
      }
      subContriesSave.push(subCountriesSave);
    }
    this.subNationalTwoSelected = null;
    this.showNationalLevelTwoSelect = false;
    setTimeout(() => {
      this.showNationalLevelTwoSelect = true;
    }, 300);
    console.log(this.body);
   
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
