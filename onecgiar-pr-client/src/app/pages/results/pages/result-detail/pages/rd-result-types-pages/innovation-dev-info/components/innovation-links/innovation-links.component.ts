import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentLinks } from '../../model/InnovationDevelopmentLinks.model';

@Component({
    selector: 'app-innovation-links',
    templateUrl: './innovation-links.component.html',
    styleUrls: ['./innovation-links.component.scss'],
    standalone: false
})
export class InnovationLinksComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentLinks = new InnovationDevelopmentLinks();

  constructor(public api: ApiService) {}

  picturesLinksAlertText() {
    return `Pictures links (Min. 1)`;
  }

  referencesLinksAlertText() {
    return `References links (Min.1)`;
  }

  temporalLinkDescription() {
    return `<ul> 
    <li>Provide only high-resolution images, photos or pictures that clearly visualize the innovation (e.g., how it provides a specific solution to a problem, its use in practice, etc.) </li>
    <li>This image(s) will be used in the final report of the survey, therefore consent to use the image(s) is needed </li>
    </ul>`;
  }

  temporalReferenceDescription() {
    return `Provide reference material(s) that describe the innovation
    <ul> 
    <li>Reference materials may include (science) publications, websites, newsletters, reports, newspaper articles, videos, etc.</li>
    </ul>`;
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
