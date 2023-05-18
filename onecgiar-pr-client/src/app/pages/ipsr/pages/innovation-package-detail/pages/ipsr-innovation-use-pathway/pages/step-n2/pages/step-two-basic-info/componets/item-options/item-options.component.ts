import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-item-options',
  templateUrl: './item-options.component.html',
  styleUrls: ['./item-options.component.scss']
})
export class ItemOptionsComponent implements OnInit {

  @Input() optionsInnovations :any;
  @Input() title:any;
  selectedOne:any[] =[]; 
  selectedCategories:any[] = [];
    constructor() { 
    }

  ngOnInit(): void {
    console.log(this.optionsInnovations);
  }

  selectes(category){
    console.log(category);
    let index = this.selectedCategories.findIndex(resp => category.complementary_innovation_enabler_types_id == resp.complementary_innovation_enabler_types_id);
    console.log(index);
    if (index !=-1) {
    this.selectedOne = this.selectedOne.concat(category.subCategories)
   }
    console.log(this.selectedOne);
    console.log(this.selectedCategories);
    
    
  }

  subSelectes(){
    console.log(this.selectedOne);
  }

}
