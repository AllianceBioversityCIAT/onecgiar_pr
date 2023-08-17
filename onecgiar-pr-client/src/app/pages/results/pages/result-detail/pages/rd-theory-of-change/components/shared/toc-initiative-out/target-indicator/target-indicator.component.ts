import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-target-indicator',
  templateUrl: './target-indicator.component.html',
  styleUrls: ['./target-indicator.component.scss']
})
export class TargetIndicatorComponent implements OnInit {

  disabledInput: boolean = false;

  iscalculated: string = 'width: 12px; height: 12px; border-radius: 100%; background-color: #B9B9B9;margin-top: 20px; margin-left: 7px;';

  @Input() initiative: any;
  @Input() disabledInputs:any;
  text = `<span style="color: #6777D8; font-weight: bold;">4. Geographic location</span>`
  constructor() { }

  ngOnInit(): void {
    console.log(this.disabledInputs);
    
  }

  statusIndicator(status){
    let statusIndicator = '';
    if (this.initiative.is_calculable) {
      if(status == 0 || status == null){
        statusIndicator = 'NO PROGRESS';
        this.iscalculated = 'width: 12px; height: 12px; border-radius: 100%; background-color:red;margin-top: 20px; margin-left: 7px;'
      }
      if(status == 1){
        statusIndicator = 'IN PROGRESS';
        this.iscalculated = 'width: 12px; height: 12px; border-radius: 100%; background-color:#E0BC00;margin-top: 20px; margin-left: 7px;'
      }
  
      if(status == 2){
        statusIndicator = 'ACHIEVED';
        this.iscalculated = 'width: 12px; height: 12px; border-radius: 100%; background-color:#38DF7B;margin-top: 20px; margin-left: 7px;'
      }
    }else{
      statusIndicator = 'INCALCULABLE';
      this.iscalculated ='width: 12px; height: 12px; border-radius: 100%; background-color: #B9B9B9;margin-top: 20px; margin-left: 7px;';
    }
    
    return statusIndicator;
    }

    validarNumero(e) {
      if (e.key === "-")
      e.preventDefault();
   }

   changesValue(){
    this.initiative.indicator_contributing = null;
   }
   descriptionAlert(){
      return `Please ensure the planned location is reflected in section <strong>4. Geographic location</strong>. If you decide to change remember to update your TOC result framework. DD is working to automate the geolocation and in the near future you will not need to fill section 4 again.`
   }
}
