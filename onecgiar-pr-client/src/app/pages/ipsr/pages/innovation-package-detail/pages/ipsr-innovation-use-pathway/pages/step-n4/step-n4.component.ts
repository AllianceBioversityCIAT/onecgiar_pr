import { Component, OnInit } from '@angular/core';
import { IpsrStep4Body } from './model/Ipsr-step-4-body.model';
import { Router } from '@angular/router';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-step-n4',
  templateUrl: './step-n4.component.html',
  styleUrls: ['./step-n4.component.scss'],
  standalone: false
})
export class StepN4Component implements OnInit {
  ipsrStep4Body = new IpsrStep4Body();
  disabledOptionsPartners = [];

  /**
   * P2-3426: from the 2026 phase onwards the "Have any studies been conducted to inform the
   * innovation scaling strategy design (...)" question is RETIRED — closed for writing. It is not
   * deleted: a package that already carries an answer keeps showing it read-only (see
   * `showScalingStudiesReadOnly`), and a package with no stored answer renders nothing at all, so
   * the last question of Step 4 becomes the estimated $ investment one.
   *
   * Gated on `phase_year`, never on `isP25()`/portfolio — per reporting/CLAUDE.md rule 9: prtest
   * holds 2025-phase results INSIDE the P25 portfolio, and a portfolio gate would retire the
   * question for those too, breaking the epic's "2025 and earlier stay exactly as today" rule.
   * The ticket's own "Phase threshold - RESOLVED" section claims `isP25()` is sufficient; that is
   * factually wrong (P25 starts in 2025) and is already flagged on the activity.
   *
   * Fails OPEN (returns false, i.e. "not retired, stay editable") when `phase_year` is not
   * available yet — an in-flight load must never lock or hide the question by mistake.
   */
  private static readonly SCALING_STUDIES_RETIRED_FROM_YEAR = 2026;

  constructor(
    public ipsrDataControlSE: IpsrDataControlService,
    public api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Step 4');
    this.getSectionInformation();
    this.api.dataControlSE.findClassTenSeconds('alert-event-3').then(resp => {
      try {
        document.querySelector('.alert-event-3').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
  }

  /**
   * P2-3426: true from the 2026 phase onwards. False for 2025 and earlier, where the question keeps
   * behaving exactly as it did before this ticket (fully editable).
   *
   * The ONLY source is `currentResultSignal().phase_year` — the phase of the Innovation Package
   * currently open. `api/ipsr/innovation-package-detail/:id` selects `v.phase_year` from the
   * package's own `version` row (`ipsr.repository.ts:282`) and `ApiService.GETInnovationPackageDetail`
   * (`api.service.ts:126`) sets it into the signal, so on this screen it is always populated.
   *
   * ⚠️ There is deliberately NO fallback. It used to read
   * `dataControlSE.reportingCurrentPhase.phaseYear`, which is the open phase of the REPORTING
   * module — a different module and, worse, a different thing: the OPEN phase, not the phase of the
   * package being viewed. Opening a 2025 package while reporting 2026 is open would have retired the
   * question for it, breaking the epic's "2025 and earlier look exactly as today" rule.
   * `dataControlSE.IPSRCurrentPhase.phaseYear` is IPSR's own equivalent and has the same defect
   * (open phase ≠ viewed package's phase), so it is not used either.
   *
   * With no phase year available we fail OPEN (return false: not retired, stay editable) rather than
   * guess — an in-flight load must never hide or lock the question by mistake.
   */
  isScalingStudiesRetired(): boolean {
    const phaseYear = this.api?.dataControlSE?.currentResultSignal?.()?.phase_year;
    if (typeof phaseYear !== 'number') return false;
    return phaseYear >= StepN4Component.SCALING_STUDIES_RETIRED_FROM_YEAR;
  }

  /**
   * P2-3426. This is the single place that decides what counts as "a stored answer exists". Change
   * this one function to change the rule; nothing else depends on the criterion.
   *
   * A stored `true` IS the criterion, on its own. `true` is unambiguous: neither the server nor
   * `IpsrStep4Body` ever writes it by itself, so it can only have come from a person clicking "Yes".
   * Case 1 of the ticket ("Innovation Package with a stored answer → the question and its answer are
   * displayed in read-only mode") therefore applies, and nothing else may be demanded of it.
   *
   * ⚠️ Do NOT re-add "…and at least one non-blank link". It hid data the ticket orders shown, and the
   * case is reachable: `syncScalingStudyUrls` puts the empty string into `urlsToCreate`
   * (`ipsr-pathway-step-four.service.ts:194-196`) and the GET returns the rows verbatim (`:625`), so
   * anyone who ticked "Yes" and saved without typing the URL — the seed row `app-studies-link` used
   * to add — ends up stored as `true` + `['']` and would stop seeing their own answer.
   *
   * ⚠️ PENDING CONFIRMATION BY THE PO (asked to Ángel Jarrín, 31-Aug-2026) — for `false` ONLY. The
   * server coerces NULL to false before the value reaches the client
   * (`ipsr-pathway-step-four.service.ts:654`, `has_scaling_studies: result_ip.has_scaling_studies ?? false`),
   * a coercion that keeps the Step 4 green check reachable and must not be removed here (that is
   * P2-3494, owned by Juan David Delgado). So a "No" written by the platform itself is
   * indistinguishable from a "No" a person actually gave, and showing it would put a read-only "No"
   * in front of users who never answered. Until the PO rules, `false` is treated as "no answer". If
   * an automatic "No" is declared to count too, this becomes
   * `this.ipsrStep4Body?.has_scaling_studies !== null && ... !== undefined` — one line.
   */
  hasStoredScalingStudiesAnswer(): boolean {
    return this.ipsrStep4Body?.has_scaling_studies === true;
  }

  /**
   * P2-3426: renders the retired question in read-only mode. Read-only reuses what already exists —
   * `[readOnly]` on `app-pr-radio-button` (paints `block-field` and disables the radios) and
   * `[disabled]` on `app-studies-link` (disables the inputs, hides delete and add).
   */
  showScalingStudiesReadOnly(): boolean {
    return this.isScalingStudiesRetired() && this.hasStoredScalingStudiesAnswer();
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayStepFourByRiId(this.api.fieldsManagerSE.isP25()).subscribe(({ response }) => {
      this.ipsrStep4Body = response;

      this.disabledOptionsPartners = this.ipsrStep4Body.institutions_expected_investment.map(item => ({
        institutions_id: item?.obj_result_institution?.institutions_id
      }));

      this.ipsrStep4Body.institutions_expected_investment = this.ipsrStep4Body.institutions_expected_investment.filter(item => {
        if (this.api.fieldsManagerSE.isP25()) {
          return item?.obj_result_institution?.institution_roles_id == 2;
        } else {
          return item?.obj_result_institution?.institution_roles_id == 7;
        }
      });
    });
  }

  onSaveSection() {
    this.api.resultsSE.PATCHInnovationPathwayStepFourByRiId(this.ipsrStep4Body, this.api.fieldsManagerSE.isP25()).subscribe(({ response }) => {
      this.getSectionInformation();
    });
  }

  onSavePrevious(descrip) {
    if (this.api.rolesSE.readOnly)
      return this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-3'], {
        queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
      });
    this.api.resultsSE.PATCHInnovationPathwayStepFourByRiIdPrevious(this.ipsrStep4Body, descrip).subscribe(({ response }) => {
      this.getSectionInformation();
      setTimeout(() => {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-3'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }, 1000);
    });
    return null;
  }
}
