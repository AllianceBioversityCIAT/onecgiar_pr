import { Injectable } from '@angular/core';
import { tap, catchError, retry, throwError, pipe } from 'rxjs';
import { ApiService } from 'src/app/shared/services/api/api.service';
@Injectable({
  providedIn: 'root'
})
export class IpsrCompletenessStatusService {
  greenChecks: GreenChecks = {
    mainSections: [
      {
        sectionNAme: 'General',
        validation: true,
        lissta: [{ y: 'k', validation: true }]
      },
      {
        sectionNAme: 'IPSR Innovation use pathway',
        validation: true
      }
    ],

    stepSections: [
      {
        step: 1,
        sectionName: 'step 1',
        validation: true
      },
      {
        step: 2,
        sectionName: 'step 2',
        validation: true,
        stepSubSections: [
          {
            subSection: 2.1,
            sectionName: '2.1',
            validation: true
          },
          {
            subSection: 2.2,
            sectionName: '2.2',
            validation: true
          }
        ]
      },
      {
        step: 3,
        sectionName: 'step 3',
        validation: true
      },
      {
        step: 4,
        sectionName: 'step 3',
        validation: true
      }
    ]
  };

  flatList = {};

  constructor(private api: ApiService) {
    this.flatList = this.flattenObject(this.greenChecks, '');
    console.log(this.flatList);
  }
  flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? prefix + '.' : '';
      if (typeof obj[k] === 'object') {
        Object.assign(acc, this.flattenObject(obj[k], pre + k));
      } else if (k === 'validation') {
        acc[pre.slice(0, -1)] = obj[k];
      }
      return acc;
    }, {});
  }

  updateGreenChecks(): any {
    // if (this.api.resultsApiSE.currentResultId) {
    this.api.resultsSE.getCompletenessStatus().subscribe(response => {
      console.log('updateGreenChecks');
      console.log(response);
      // this.submit = Boolean(response?.submit);
      // this.api.dataControlSE.green_checks = response?.green_checks;
      // this.api.resultsSE.PATCH_greenChecksByResultId().subscribe();
    });
    // }
  }
}

interface GreenChecks {
  mainSections: MainSection[];
  stepSections: StepSection[];
}

interface StepSection {
  step: number;
  sectionName: string;
  validation: boolean;
  stepSubSections?: StepSubSection[];
}

interface StepSubSection {
  subSection: number;
  sectionName: string;
  validation: boolean;
}

interface MainSection {
  sectionNAme: string;
  validation: boolean;
  lissta?: any;
}
