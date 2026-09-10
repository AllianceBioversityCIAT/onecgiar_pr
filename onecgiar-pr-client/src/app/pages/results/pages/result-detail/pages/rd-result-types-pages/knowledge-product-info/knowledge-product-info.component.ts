import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { FullFairData, KnowledgeProductBody } from './model/knowledgeProductBody';
import {
  FairDimension,
  fairBorderColor,
  fairInnerColor,
  mapKnowledgeProductBody,
  splitFairDimensions
} from './model/knowledge-product-metadata.mapper';
import { KnowledgeProductBodyMapped } from './model/KnowledgeProductBodyMapped';
import { KnowledgeProductSaveDto } from './model/knowledge-product-save.dto';
import { TocMeliaStudyItem } from './model/toc-melia-study.interface';
import { RolesService } from '../../../../../../../shared/services/global/roles.service';
import { CustomizedAlertsFeService } from '../../../../../../../shared/services/customized-alerts-fe.service';
import { FieldsManagerService } from '../../../../../../../shared/services/fields-manager.service';

@Component({
  selector: 'app-knowledge-product-info',
  templateUrl: './knowledge-product-info.component.html',
  styleUrls: ['./knowledge-product-info.component.scss'],
  standalone: false
})
export class KnowledgeProductInfoComponent implements OnInit {
  knowledgeProductBody = new KnowledgeProductBodyMapped();
  sectionData: KnowledgeProductSaveDto = new KnowledgeProductSaveDto();
  meliaTypes = [];
  ostMeliaStudies = [];
  tocMeliaStudiesList: TocMeliaStudyItem[] = [];
  fair_data: FairDimension[];

  constructor(
    public api: ApiService,
    public fieldsManagerSE: FieldsManagerService,
    public rolesSE: RolesService,
    private customizedAlertsFeSE: CustomizedAlertsFeService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Knowledge product information');
  }

  get fairGuideline(): string {
    const repositoryName = this.knowledgeProductBody?.source || 'the repository';
    return `FAIR (findability, accessibility, interoperability, and reusability) scores are used to support reporting that aligns with the <a href="https://cgspace.cgiar.org/handle/10568/113623" target="_blank">CGIAR Open and FAIR Data Assets Policy</a>. FAIR scores are calculated based on the presence or absence of metadata in ${repositoryName}. If you wish to enhance the FAIR score for a knowledge product, review the metadata flagged with a red icon below and liaise with your Center's knowledge management team to implement improvements.`;
  }

  /**
   * Drives `[appSectionSkeleton]`. TRUE from construction: the body object is empty until the
   * section GET lands, so without it every mandatory field paints orange ("empty") first.
   * Released on `next` AND `error` — a failed GET must not leave the section shimmering.
   */
  readonly sectionLoading = signal(true);

  ngOnInit(): void {
    this.getSectionInformation();
  }

  getSectionInformation() {
    this.api.resultsSE.GET_resultknowledgeProducts().subscribe({
      next: ({ response }) => {
        this.knowledgeProductBody = this._mapFields(response as KnowledgeProductBody);
        this.sectionData.clarisaMeliaTypeId = response.melia_type_id;
        this.sectionData.isMeliaProduct = response.is_melia;
        this.sectionData.ostMeliaId = response.ost_melia_study_id;
        this.sectionData.ostSubmitted = response.melia_previous_submitted;
        if (this.api.fieldsManagerSE.isP25()) {
          this.sectionData.tocMeliaStudyId = response.toc_melia_study_id ?? null;
          const currentResult = this.api.dataControlSE.currentResultSignal() ?? this.api.dataControlSE.currentResult;
          const programId = currentResult?.initiative_id;
          if (programId != null) {
            this.api.resultsSE.GET_meliaStudiesByToc(programId).subscribe(({ response: tocResponse }) => {
              this.tocMeliaStudiesList = tocResponse ?? [];
            });
          }
        } else {
          this.api.resultsSE.GET_ostMeliaStudiesByResultId().subscribe(({ response: ostResponse }) => {
            this.ostMeliaStudies = ostResponse ?? [];
          });
        }
        this.sectionLoading.set(false);
      },
      error: () => this.sectionLoading.set(false)
    });
    this.api.resultsSE.GET_allClarisaMeliaStudyTypes().subscribe(({ response }) => {
      this.meliaTypes = response;
    });
  }

  onSyncSection() {
    const confirmationMessage = `Sync result with CGSpace? <br/> Unsaved changes in the section will be lost. `;

    this.customizedAlertsFeSE.show(
      {
        id: 'delete-tab',
        title: 'Sync confirmation',
        description: confirmationMessage,
        status: 'warning',
        confirmText: 'Yes, sync information'
      },
      () => {
        this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
          this.getSectionInformation();
        });
      }
    );
  }

  /** Delegates to the shared mapper — see `model/knowledge-product-metadata.mapper.ts`. */
  private _mapFields(response: KnowledgeProductBody): KnowledgeProductBodyMapped {
    const { mapped, fairData } = mapKnowledgeProductBody(response);
    this.fair_data = fairData;
    return mapped;
  }

  public calculateInnerColor(value: number) {
    return fairInnerColor(value);
  }

  public calculateBorderColor(value: number) {
    return fairBorderColor(value);
  }

  filterOutObject(fairObject: FullFairData): FairDimension[] {
    return splitFairDimensions(fairObject);
  }

  onSaveSection() {
    this.api.resultsSE.PATCH_knowledgeProductSection(this.sectionData).subscribe(({ response }) => {
      this.getSectionInformation();
    });
  }
}
