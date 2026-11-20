import { Injectable } from '@angular/core';
@Injectable({
  providedIn: 'root'
})
export class IpsrDataControlService {
  detailData: DetailData = null;
  resultInnovationCode = null;
  resultInnovationId = null;
  resultInnovationPhase = null;
  ipsrPhaseList = [];
  ipsrResultList = [];
  ipsrUpdateResultModal = false;

  initiative_id = null;
  inIpsr = null;
  inContributos = null;
  modals = {
    submission: false,
    unsubmit: false
  };
}

interface DetailData {
  result_id: string;
  result_code: string;
  title: string;
  official_code: string;
  initiative_official_code?: string;
  initiative_name?: string;
  result_level: string;
  result_type: string;
  inititiative_id: string;
  status: string;
  status_id: number;
  validResult: string | number;
  portfolio: string;
  /** `result.in_qa` and `version.status` from the detail endpoint (QA review lock, P2-3912). */
  inQA?: number | boolean;
  is_phase_open?: number;
}
