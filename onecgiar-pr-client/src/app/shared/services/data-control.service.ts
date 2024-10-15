import { Injectable } from '@angular/core';
import { ResultItem } from '../interfaces/result.interface';
import { environment } from '../../../environments/environment';
import { Title } from '@angular/platform-browser';
import { CurrentResult } from '../interfaces/current-result.interface';
import { ModuleTypeEnum, StatusPhaseEnum } from '../enum/api.enum';
import { ResultsApiService } from './api/results-api.service';

@Injectable({
  providedIn: 'root'
})
export class DataControlService {
  showPartnersRequest: boolean = false;
  showRetrieveRequest: boolean = false;
  myInitiativesList = [];
  myInitiativesLoaded = false;
  resultsList: ResultItem[];
  currentResult: CurrentResult = {};
  showSectionSpinner = false;
  currentSectionName = '';
  fieldFeedbackList = [];
  showShareRequest = false;
  chagePhaseModal = false;
  updateResultModal = false;
  changeResultTypeModal = false;
  inNotifications = false;
  currentNotification = null;
  green_checks = null;
  show_qa_full_screen = false;
  showResultHistoryOfChangesModal = false;
  resultPhaseList = [];
  showMassivePhaseShiftModal = false;
  massivePhaseShiftIsRunning = false;
  tocUrl = environment?.tocUrl;
  showT1RSelectPhase?: boolean;
  reportingCurrentPhase = { phaseName: null, phaseYear: null, phaseId: null };
  previousReportingPhase = { phaseName: null, phaseYear: null, phaseId: null };
  IPSRCurrentPhase = { phaseName: null, phaseYear: null };
  previousIPSRPhase = { phaseName: null, phaseYear: null };

  constructor(private titleService: Title, public resultsSE: ResultsApiService) {}

  getCurrentPhases() {
    this.resultsSE.GET_versioning(StatusPhaseEnum.OPEN, ModuleTypeEnum.REPORTING).subscribe(({ response }) => {
      this.reportingCurrentPhase.phaseYear = response[0]?.phase_year;
      this.reportingCurrentPhase.phaseName = response[0]?.phase_name;
      this.reportingCurrentPhase.phaseId = response[0]?.id;

      if (response[0]?.obj_previous_phase) {
        this.previousReportingPhase.phaseYear = response[0]?.obj_previous_phase.phase_year;
        this.previousReportingPhase.phaseName = response[0]?.obj_previous_phase.phase_name;
        this.previousReportingPhase.phaseId = response[0]?.obj_previous_phase.id;
      } else {
        this.previousReportingPhase.phaseYear = null;
        this.previousReportingPhase.phaseName = null;
        this.previousReportingPhase.phaseId = null;
      }
    });
  }

  getCurrentIPSRPhase() {
    this.resultsSE.GET_versioning(StatusPhaseEnum.OPEN, ModuleTypeEnum.IPSR).subscribe(({ response }) => {
      this.IPSRCurrentPhase.phaseYear = response[0]?.phase_year;
      this.IPSRCurrentPhase.phaseName = response[0]?.phase_name;

      if (response[0]?.obj_previous_phase) {
        this.previousIPSRPhase.phaseYear = response[0]?.obj_previous_phase.phase_year;
        this.previousIPSRPhase.phaseName = response[0]?.obj_previous_phase.phase_name;
      } else {
        this.previousIPSRPhase.phaseYear = null;
        this.previousIPSRPhase.phaseName = null;
      }
    });
  }

  validateBody(body: any) {
    return Object.entries(body).every((item: any) => item[1]);
  }

  myInitiativesListText(initiatives) {
    let result = '';
    initiatives?.map((item, index) => {
      result += item.name + (index + 1 < initiatives?.length ? ', ' : '');
    });
    return result;
  }

  listenTextTenSeconds(text) {
    let seconds = 0;
    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        seconds++;
        if (text) {
          resolve(text);
        }
        if (seconds == 10) {
          clearInterval(timer);
          reject(new Error('Timeout after 10 seconds'));
        }
      }, 1000);
    });
  }

  findClassTenSeconds(className) {
    let seconds = 0;
    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        seconds++;
        if (document.querySelector(`.${className}`)) {
          resolve(document.querySelector(`.${className}`));
          clearInterval(timer);
        }
        if (seconds == 10) {
          clearInterval(timer);
          resolve(false);
        }
      }, 1000);
    });
  }

  getLastWord(text) {
    if (!text) return '';
    const lastWord = text?.split(' ')[text?.split(' ').length - 1];
    return lastWord[0].toUpperCase() + lastWord.substring(1);
  }

  get isKnowledgeProduct() {
    return this.currentResult?.result_type_id == 6;
  }

  someMandatoryFieldIncomplete(container) {
    const htmlContainer = document.querySelector(container);
    if (!htmlContainer) return true;
    let inputs;
    let selects;
    try {
      inputs = Array.prototype.slice.call(htmlContainer.querySelectorAll('.pr-input.mandatory input')).some(field => !field.value);
      selects = Array.prototype.slice
        .call(htmlContainer.querySelectorAll('.pr-select.mandatory'))
        .some((field: HTMLElement) => !field.classList.contains('complete'));
    } catch (error) {
      console.error(error);
    }
    return inputs || selects;
  }

  someMandatoryFieldIncompleteResultDetail(container) {
    this.fieldFeedbackList = [];
    const htmlContainer = document.querySelector(container);
    if (!htmlContainer) return true;
    let inputs;
    let selects;
    try {
      inputs = Array.prototype.slice.call(htmlContainer.querySelectorAll('.pr-input.mandatory .input-validation')).filter(field => {
        const tagValue = field?.parentElement?.parentElement?.parentElement?.querySelector('.pr_label')?.innerText;
        const isEmpty = !field?.innerText;

        if (tagValue && isEmpty) this.fieldFeedbackList.push(tagValue);

        return isEmpty;
      });
      selects = Array.prototype.slice.call(htmlContainer.querySelectorAll('.pr-field.mandatory')).filter((field: HTMLElement) => {
        let tagValue: any = field?.parentElement?.querySelector('.pr_label');
        tagValue = tagValue?.innerText;
        const isIncomplete = !field.classList.contains('complete');

        if (tagValue && isIncomplete) this.fieldFeedbackList.push(tagValue);
        return isIncomplete;
      });
    } catch (error) {
      console.error(error);
    }
    return Boolean(inputs) || Boolean(selects);
  }

  detailSectionTitle(sectionName, title?) {
    this.titleService.setTitle(title || sectionName);
    this.currentSectionName = title || sectionName;
  }
}
