import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-target-indicator',
  templateUrl: './target-indicator.component.html',
  styleUrls: ['./target-indicator.component.scss']
})
export class TargetIndicatorComponent implements OnInit {

  disabledInput: boolean = false;

  iscalculated: boolean = false;

  @Input() initiative: any;
  @Input() disabledInputs:any;
  constructor() { }

  ngOnInit(): void {
    console.log(this.disabledInputs);
    
  }

}
