import { Component, Input, OnInit } from '@angular/core';
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
  constructor(public api: ApiService) { }

  ngOnInit(): void {
    console.log(this.body);
    
  }

  getSubNationalLevelOne(){
    let isoAlpha = this.body.filter((resp) => this.countrySelected == resp.id)[0]['iso_alpha_2'];
    console.log(isoAlpha);
    
    this.api.resultsSE.getSubNationalLevelOne(isoAlpha).subscribe((resp) => {
      console.log(resp);
      
    })
  }

}
