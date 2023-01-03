import { Component, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from './model/innovationDevInfoBody';
import { InnovationControlListService } from '../../../../../../../shared/services/global/innovation-control-list.service';
import { ApiService } from '../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-innovation-dev-info',
  templateUrl: './innovation-dev-info.component.html',
  styleUrls: ['./innovation-dev-info.component.scss']
})
export class InnovationDevInfoComponent implements OnInit {
  innovationDevInfoBody = new InnovationDevInfoBody();
  range = 5;
  constructor(private api: ApiService, public innovationControlListSE: InnovationControlListService) {}

  ngOnInit(): void {
    this.getSectionInformation();
  }
  getSectionInformation() {
    this.api.resultsSE.GET_innovationDev().subscribe(
      ({ response }) => {
        console.log(response);
        this.innovationDevInfoBody = response;
      },
      err => {
        console.log(err);
      }
    );
  }
  onSaveSection() {
    console.log(this.innovationDevInfoBody);
    if (this.innovationDevInfoBody.innovation_nature_id != 12) {
      console.log('clean');
      this.innovationDevInfoBody.number_of_varieties = null;
      this.innovationDevInfoBody.is_new_variety = null;
    }
    this.api.resultsSE.PATCH_innovationDev(this.innovationDevInfoBody).subscribe(
      ({ response }) => {
        console.log(response);
        this.getSectionInformation();
      },
      err => {
        console.log(err);
      }
    );
  }
  pdfOptions = [
    { name: 'Yes', value: true },
    { name: 'No, not necessary at this stage', value: false }
  ];
  pdfDescription() {
    return `Examples of IPSR Innovation Profiles can be found  <a class="open_route" target="_blank" href="https://cgspace.cgiar.org/handle/10568/121923">here</a>.`;
  }
  acknowledgementDescription() {
    return `Are there any specific investors or donors – other than the <a class="open_route" target="_blank" href="https://www.cgiar.org/funders/">CGIAR Fund Donors</a> – who provide core/pooled funding – that you wish to acknowledge for their critical contribution to the continued development, testing, and scaling of this innovation? <br> - Please separate donor/investor names by a semicolon. <br> - Donors/investors will be included in the acknowledgment section in the Innovation Profile.`;
  }
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
  readiness_of_this_innovation_description() {
    return `<ul>
    <li>In case the innovation readiness level differs across countries or regions, we advise to assign the highest current innovation readiness level that can be supported by the evidence provided.</li>
    <li>Be realistic in assessing the readiness level of the innovation and keep in mind that the claimed readiness level needs to be supported by evidence documentation.</li>
    <li>The innovation readiness level will be quality assessed.</li>
    </ul>`;
  }
}
