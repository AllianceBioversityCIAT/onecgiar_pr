import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-item-options',
  templateUrl: './item-options.component.html',
  styleUrls: ['./item-options.component.scss']
})
export class ItemOptionsComponent implements OnInit {
  @Input() optionsInnovations: any;
  @Input() title: any;
  @Input() typeOne: any[] = [];
  @Input() typeTwo: any[] = [];
  selectedOne: any[] = [];
  selectedCategories: any[] = [];

  constructor() {}

  ngOnInit(): void {
    this.selectedOne = Array.from(this.typeOne);
    this.selectedCategories = Array.from(this.typeTwo);
  }

  selectes(category) {
    const index = this.selectedCategories.findIndex(resp => category.complementary_innovation_enabler_types_id == resp.complementary_innovation_enabler_types_id);
    if (index != -1) {
      this.selectedOne = this.selectedOne.concat(category.subCategories);
    }
    if (index == -1 && category.subCategories.length != 0) {
      this.selectedOne = [];
    }
    this.typeOne = this.selectedOne;
    this.typeTwo = this.selectedCategories;
  }

  subSelectes(category) {
    if (category.subCategories.length != this.selectedOne.length) {
      const index = this.selectedCategories.findIndex(resp => category.complementary_innovation_enabler_types_id == resp.complementary_innovation_enabler_types_id);
      if (index != -1) {
        this.selectedCategories.splice(index, 1);
      }
    }
    if (category.subCategories.length == this.selectedOne.length) {
      this.selectedCategories.push(category);
    }
  }
}
