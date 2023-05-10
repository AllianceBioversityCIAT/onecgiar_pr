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
  subNationalOneSelected = [];
  subNationalTwo:any = [];
  subNationalTwoSelected = [];
  @Output() selectOptionEvent = new EventEmitter();
  constructor(public api: ApiService) { }

  ngOnInit(): void {
    console.log(this.body);
    
  }

  getSubNationalLevelOne(){
    let isoAlpha = this.body.filter((resp) => this.countrySelected == resp.id)[0]['iso_alpha_2'];
    console.log(isoAlpha);
    this.api.resultsSE.getSubNationalLevelOne(isoAlpha).subscribe((resp) => {
      this.subNationalOne = resp['response']
      console.log(resp);
    })
  }

  getSSubNationalLevelTwo(){
    let isoAlpha = this.body.filter((resp) => this.countrySelected == resp.id)[0]['iso_alpha_2'];
    let adminCode = this.subNationalOne.filter((resp) => this.subNationalOneSelected == resp.geonameId)[0]['adminCode1'];
    console.log(isoAlpha);
    this.api.resultsSE.getSubNationalLevelTwo(isoAlpha,adminCode).subscribe((resp) => {
    this.subNationalTwo = resp['response']
      console.log(resp);
    })
  }

  delete(index){
    this.selectOptionEvent.emit(index);
  }

}
