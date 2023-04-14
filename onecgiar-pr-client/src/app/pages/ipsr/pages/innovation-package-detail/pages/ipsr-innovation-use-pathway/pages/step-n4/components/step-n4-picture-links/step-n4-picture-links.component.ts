import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep4Body } from '../../model/Ipsr-step-4-body.model';

@Component({
  selector: 'app-step-n4-picture-links',
  templateUrl: './step-n4-picture-links.component.html',
  styleUrls: ['./step-n4-picture-links.component.scss']
})
export class StepN4PictureLinksComponent implements OnInit {
  @Input() body = new IpsrStep4Body();
  constructor() {}

  ngOnInit(): void {}
  addItem() {
    this.body.list1.push({});
  }
}
