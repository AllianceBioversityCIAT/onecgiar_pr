import { Component, Input, OnInit } from '@angular/core';
import { RolesService } from '../../../../../../../../../shared/services/global/roles.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';

@Component({
  selector: 'app-innovation-links',
  templateUrl: './innovation-links.component.html',
  styleUrls: ['./innovation-links.component.scss']
})
export class InnovationLinksComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  linkList1 = [{}];
  linkList2 = [{}];
  constructor(public api: ApiService) {}

  ngOnInit(): void {}

  temporalLinkDescription() {
    return `
    <li>Provide only high-resolution images, photos or pictures that clearly visualize the innovation (e.g., how it provides a specific solution to a problem, its use in practice, etc.) </li>
    <li>This image(s) will be used in the final report of the survey, therefore consent to use the image(s) is needed </li>`;
  }

  temporalReferenceDescription() {
    return `
    <li>Reference materials may include (science) publications, websites, newsletters, reports, newspaper articles, videos, etc.</li>
    `;
  }

  addLink() {
    this.linkList1.push({});
  }

  deleteLink(index) {
    this.linkList1.splice(index, 1);
  }

  addLink2() {
    this.linkList2.push({});
  }

  deleteLink2(index) {
    this.linkList2.splice(index, 1);
  }
}
