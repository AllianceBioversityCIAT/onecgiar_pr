import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-item-options',
  templateUrl: './item-options.component.html',
  styleUrls: ['./item-options.component.scss']
})
export class ItemOptionsComponent implements OnInit {

  @Input() optionsInnovations :any;
  @Input() title:any;
  selectedCategories:any;
    constructor() { 
      
      
    }

  ngOnInit(): void {
    console.log(this.optionsInnovations);
  }

}
