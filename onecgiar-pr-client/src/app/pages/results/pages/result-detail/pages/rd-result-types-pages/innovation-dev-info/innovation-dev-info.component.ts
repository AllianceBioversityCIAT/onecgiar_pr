import { Component, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from './model/innovationDevInfoBody';

@Component({
  selector: 'app-innovation-dev-info',
  templateUrl: './innovation-dev-info.component.html',
  styleUrls: ['./innovation-dev-info.component.scss']
})
export class InnovationDevInfoComponent implements OnInit {
  innovationDevInfoBody = new InnovationDevInfoBody();
  range = 5;
  constructor() {}

  ngOnInit(): void {
    this.getSectionInformation();
  }
  getSectionInformation() {}
  onSaveSection() {}
  alertInfoText() {
    return `Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale. Innovations may be at early stages of readiness (ideation or basic research) or at more mature stages of readiness (delivery and scaling)<br><br>The specific number of new or improved lines/ varieties can be specified under Innovation Typology.`;
  }
  alertInfoText2() {
    return `Please make sure you provide evidence/documentation that support the current innovation readiness level.<br>
    * Evidence are inputted in the General information section (click here to go there)<br>
    <br><br>
    Documentation may include idea-notes, concept-notes, technical report, pilot testing report, experimental data paper, newsletter, etc. It may be project reports, scientific publications, book chapters, communication materials that provide evidence of the current development/ maturity stage of the innovation. 
    <br><br>
    Examples of evidence documentation for different CGIAR innovations and readiness levels can be found <a target="_blank" href="https://drive.google.com/file/d/1rWGC0VfxazlzdZ1htcfBSw1jO7GmVQbq/view" class='open_route alert-event'>here</a>`;
  }
}
