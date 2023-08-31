import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RdTheoryOfChangesServicesService {
  targetsIndicators: any = [];
  impactAreasTargets: any = [];
  sdgTargest: any = [];
  actionAreaOutcome:any = [];
  isSdg: boolean;
  isImpactArea: boolean;
  body:intefacesTheoryOfChanges[]= [];
  resultActionArea: any = [];
  constructor() { }
}

export class intefacesTheoryOfChanges{
  targetsIndicators: any[];
  impactAreasTargets: any[];
  sdgTargest: any[];
  actionAreaOutcome:any[];
  isSdg: boolean;
  isImpactArea: boolean;
  initiative:number;
  resultId:number;
  is_sdg_action_impact:string;
}
