import { Injectable } from '@angular/core';
import { ResultItem } from '../interfaces/result.interface';

@Injectable({
  providedIn: 'root'
})
export class DataControlService {
  showPartnersRequest: boolean = false;
  myInitiativesList = [];
  resultsList: ResultItem[];
  currentResult: any;
  showSectionSpinner = false;
  currentSectionName = '';
  constructor() {}
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
        console.log('sdsd  ' + seconds);
        seconds++;
        if (text) {
          resolve(text);
        }
        if (seconds == 10) {
          clearInterval(timer);
          reject('error');
        }
      }, 1000);
    });
  }

  async findClassTenSeconds(className) {
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
          reject('error');
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
    // console.log(this.currentResult);
    return this.currentResult?.result_type_id == 6;
  }

  someMandatoryFieldIncomplete(container) {
    // console.log('-  ');
    const htmlContainer = document.querySelector(container);
    if (!htmlContainer) return true;
    let inputs;
    let selects;
    try {
      inputs = Array.prototype.slice.call(htmlContainer.querySelectorAll('.pr-input.mandatory input')).some(field => !Boolean(field.value));
      selects = Array.prototype.slice.call(htmlContainer.querySelectorAll('.pr-select.mandatory')).some((field: HTMLElement) => !field.classList.contains('complete'));
    } catch (error) {}
    return inputs || selects;
  }
}
