import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n2',
  templateUrl: './step-n2.component.html',
  styleUrls: ['./step-n2.component.scss']
})
export class StepN2Component implements OnInit {
  constructor(public api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.setTitle('Step 2');
  }

  routerStep(){
    let router = '';

    if(this.api.rolesSE.isAdmin && this.api.isStepTwoTwo == false){
      return 'basic-info'
    }
    if(this.api.isStepTwoTwo){
      return '../step-3'
    }
    else{
      return '../step-3'
    }
    return router;
  }

  routerStepBack(){
    let router = '';
    
    if(this.api.rolesSE.isAdmin && this.api.isStepTwoOne == false){
      return 'complementary-innovation'
    }
    if(this.api.isStepTwoOne){
      return '../step-1'
    }
    else{
      return '../step-1'
    }
    return router;
  }
}
