import { Component, Input, OnInit } from '@angular/core';
import { RolesService } from '../../../../../../../../../shared/services/global/roles.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentLinks, linkType } from '../../model/InnovationDevelopmentLinks.model';

@Component({
  selector: 'app-innovation-links',
  templateUrl: './innovation-links.component.html',
  styleUrls: ['./innovation-links.component.scss']
})
export class InnovationLinksComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentLinks = new InnovationDevelopmentLinks();
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

  addLinkPictures() {
    if (this.body.pictures.length > 0) {
      this.body.pictures.forEach((element, index) => {
        if (element.link === '') {
          this.body.pictures.splice(index, 1);
        }
      });
    }

    this.body.pictures.push({ link: '' });
  }

  deleteLinkPictures(index) {
    this.body.pictures.splice(index, 1);
  }

  addLinkReferences() {
    if (this.body.reference_materials.length > 0) {
      this.body.reference_materials.forEach((element, index) => {
        if (element.link === '') {
          this.body.reference_materials.splice(index, 1);
        }
      });
    }

    this.body.reference_materials.push({ link: '' });
  }

  deleteLinkReferences(index) {
    this.body.reference_materials.splice(index, 1);
  }
}
