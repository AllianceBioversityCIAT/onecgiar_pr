import { Component } from '@angular/core';

@Component({
  selector: 'app-knowledge-products',
  templateUrl: './knowledge-products.component.html',
  styleUrls: ['./knowledge-products.component.scss']
})
export class KnowledgeProductsComponent {
  confidence_level: number = 90;
  isLoading: boolean = false;

  onDownLoadTableAsExcel() {
    this.isLoading = true;

    setTimeout(() => {
      this.isLoading = false;
    }, 2000);
  }
}
