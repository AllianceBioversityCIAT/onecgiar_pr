import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-knowledge-product-info',
  templateUrl: './knowledge-product-info.component.html',
  styleUrls: ['./knowledge-product-info.component.scss']
})
export class KnowledgeProductInfoComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
  }
  getSectionInformation() {}
  onSaveSection() {}
  showAlerts() {}
}
