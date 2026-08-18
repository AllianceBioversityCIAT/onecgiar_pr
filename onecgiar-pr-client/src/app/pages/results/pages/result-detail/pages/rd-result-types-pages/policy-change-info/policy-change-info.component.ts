import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InnovationUseInfoBody, PolicyChangeQuestions } from './model/innovationUseInfoBody';
import { PolicyControlListService } from '../../../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../../../shared/services/global/institutions.service';

@Component({
  selector: 'app-policy-change-info',
  templateUrl: './policy-change-info.component.html',
  styleUrls: ['./policy-change-info.component.scss'],
  standalone: false
})
export class PolicyChangeInfoComponent implements OnInit {
  innovationUseInfoBody = new InnovationUseInfoBody();
  policyChangeQuestions = new PolicyChangeQuestions();
  cantidad: string = '';
  relatedTo: string = '';
  relatedToOptions = [
    { value: 'policy-change', label: 'Policy change' },
    { value: 'capacity-development', label: 'The capacity development of key actors in a policy process' }
  ];

  constructor(
    public api: ApiService,
    public policyControlListSE: PolicyControlListService,
    public institutionsService: InstitutionsService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Policy change information');
  }

  /**
   * Drives `[appSectionSkeleton]`. TRUE from construction: the body object is empty until the
   * section GET lands, so without it every mandatory field paints orange ("empty") first.
   * Released on `next` AND `error` — a failed GET must not leave the section shimmering.
   */
  readonly sectionLoading = signal(true);

  ngOnInit(): void {
    this.getSectionInformation();
    this.getPolicyChangesQuestions();
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
  }

  changeAnswerBoolean(value) {
    this.policyChangeQuestions.optionsWithAnswers.forEach(option => {
      option.answer_boolean = option.result_question_id === value ? true : null;
    });
  }

  getSectionInformation() {
    this.api.resultsSE.GET_policyChanges().subscribe({
      next: ({ response }) => {
        this.innovationUseInfoBody = response;
        this.sectionLoading.set(false);
      },
      error: () => this.sectionLoading.set(false)
    });
  }

  getPolicyChangesQuestions() {
    this.api.resultsSE.GET_policyChangesQuestions().subscribe(({ response }) => {
      this.policyChangeQuestions = response;
      this.relatedTo = this.policyChangeQuestions?.optionsWithAnswers.filter(option => option.answer_boolean === true)[0]?.result_question_id;
    });
  }

  policyTypeDescriptions() {
    return `<strong>Policy type guidance</strong> <ul>
    <li><strong>Policy or strategy:</strong> Policies are written and formally approved decisions on, or commitments to, a particular course of action by an institution or organization (including but not limited to governments, NGOs, private sector). Strategies are high-level plans outlining how a particular course of action will be carried out. These documents show the intent of an organization or entity. Examples are country growth strategies, country agricultural policies, organization strategic plans or road maps. These documents set the goalposts but then require other instruments for implementation.</li>
    <li><strong>Legal instrument:</strong> Legal instruments include laws, which are defined as Bills passed into law by the highest elected body (a parliament, congress or equivalent); or regulations, which are defined as rules or norms adopted by a government. These laws and regulations dictate very specifically actions and behaviors that are to be followed or prohibited and often include language on implications of non-compliance.</li>
    <li><strong>Program, budget or investment:</strong> These are implementing mechanisms that often follow from a strategy, policy or law. There is typically a well-defined set of actions outlined over a specific period of time and with a specific budgetary amount attached. A National Agricultural Investment Plan is an example, the budget within a ministry is another, investments from the private sector fit here, as well as programs launched by multilateral, public, private and NGO sectors.</li>
    </ul>`;
  }

  onSaveSection() {
    const body = {
      ...this.innovationUseInfoBody,
      ...this.policyChangeQuestions
    };

    this.api.resultsSE.PATCH_policyChanges(body).subscribe(resp => {
      this.getSectionInformation();
    });
  }
}
