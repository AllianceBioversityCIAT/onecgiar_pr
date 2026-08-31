import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../services/api/api.service';

@Component({
  selector: 'app-studies-link',
  templateUrl: './studies-link.component.html',
  styleUrls: ['./studies-link.component.scss'],
  standalone: false
})
export class StudiesLinkComponent implements OnInit {
  @Input() body: any = {};
  @Input() disabled: boolean = false;
  constructor(public api: ApiService) {}

  /**
   * P2-3426: seeding one empty row is what gives an editable list its first "Add link" input — but
   * it must NOT happen when the list is read-only. In `disabled` mode that empty string would paint
   * a phantom blank row the user cannot fill in, and worse, it would ride along in the PATCH body
   * and be persisted as a stored study URL.
   */
  ngOnInit() {
    if (!Array.isArray(this.body.scaling_studies_urls)) {
      this.body.scaling_studies_urls = [];
    }
    if (!this.disabled && this.body.scaling_studies_urls.length === 0) {
      this.body.scaling_studies_urls = [''];
    }
  }

  addStudiesLink() {
    if (this.body.scaling_studies_urls.length > 0) {
      for (let index = this.body.scaling_studies_urls.length - 1; index >= 0; index--) {
        const element = this.body.scaling_studies_urls[index];
        if (element === '') {
          this.body.scaling_studies_urls.splice(index, 1);
        }
      }
    }
    this.body.scaling_studies_urls.push('');
  }

  deleteStudiesLink(index: number) {
    this.body.scaling_studies_urls.splice(index, 1);
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}
