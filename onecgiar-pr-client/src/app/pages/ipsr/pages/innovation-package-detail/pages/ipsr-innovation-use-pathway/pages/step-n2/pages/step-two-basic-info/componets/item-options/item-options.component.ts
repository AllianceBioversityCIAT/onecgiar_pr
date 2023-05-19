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
   }if(index ==-1){
    this.selectedOne = []
   }
    console.log(this.selectedOne);
    console.log(this.selectedCategories);
    
    
  }

  subSelectes(category){
    console.log(this.selectedOne);
    if(category.subCategories.length != this.selectedOne.length){
      let index = this.selectedCategories.findIndex(resp => category.complementary_innovation_enabler_types_id == resp.complementary_innovation_enabler_types_id);
      if(index != -1){
        this.selectedCategories.splice(index,1)
        console.log(this.selectedCategories);
        
      }
      
    }else{
      this.selectedCategories.push(category);
      console.log(this.selectedCategories);
      
    }
  }

  

}
