import { EventEmitter, Injectable, signal } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class InstitutionsService {
  institutionsList = [];
  institutionsWithoutCentersList = [];
  /**
   * Legacy plain-array view of the partner-shaped institutions catalogue. Kept as-is: several screens read it
   * directly from their templates, and a template binding re-evaluates on every change-detection pass, so it
   * recovers on its own once anything else on the screen changes.
   */
  institutionsWithoutCentersListPartners = [];
  /**
   * P2-3335: signal-backed view of the SAME list, written together with the plain array above.
   *
   * The catalogue resolves asynchronously, so any `computed()` that reads the plain array caches whatever was
   * there on its first evaluation and never recomputes when the HTTP response lands — a plain array is not a
   * reactive dependency, and under zoneless change detection nothing rescues it either. That is why the
   * "Other(s) External Partners" dropdown stayed on "No information found" for good. Consumers that build a
   * `computed()` over this catalogue must read `institutionsWithoutCentersPartners()` instead.
   *
   * Same shape as the migration accepted for the centers catalogue in P2-3190 (`centersList` + `centers`).
   */
  readonly institutionsWithoutCentersPartners = signal<any[]>([]);
  institutionsTypesList = [];
  institutionsTypesPartnerRequestList = [];
  institutionsChildlessTypes = [];

  loadedInstitutions: EventEmitter<boolean> = new EventEmitter();

  constructor(private readonly api: ApiService) {
    this.api.resultsSE.GET_allInstitutions().subscribe(({ response }) => {
      this.institutionsList = response;
      this.institutionsWithoutCentersList = response.filter(it => it.is_center != '1');
      this.institutionsWithoutCentersListPartners = this.institutionsWithoutCentersList.map(inst => {
        return {
          ...inst,
          obj_institutions: {
            name: inst.institutions_name,
            obj_institution_type_code: {
              name: inst.institutions_type_name,
              id: inst.institutions_type_id
            }
          },
          delivery: []
        };
      });
      // P2-3335: written together with the plain array so both views of the catalogue always agree.
      this.institutionsWithoutCentersPartners.set(this.institutionsWithoutCentersListPartners ?? []);
      this.loadedInstitutions.emit(true);
    });
    this.api.resultsSE.GET_allInstitutionTypes().subscribe(({ response }) => {
      this.institutionsTypesList = response;
      this.institutionsTypesPartnerRequestList = this.institutionsTypesList.filter(it => !it.is_legacy);
    });

    this.api.resultsSE.GET_allChildlessInstitutionTypes().subscribe(({ response }) => {
      this.institutionsChildlessTypes = response;
    });
  }
}
