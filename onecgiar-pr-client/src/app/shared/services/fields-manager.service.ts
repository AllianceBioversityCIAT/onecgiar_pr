import { Injectable, computed, inject, signal } from '@angular/core';
import { CustomField } from '../interfaces/customField.interface';
import { DataControlService } from './data-control.service';
import { ReportingDesignYear } from '../enum/reporting-design-year.enum';
enum Portfolios {
  'P22' = 0,
  'P25' = 1
}
@Injectable({
  providedIn: 'root'
})
export class FieldsManagerService {
  dataControlSE = inject(DataControlService);
  porfolioExists = computed(() => this.dataControlSE.currentResultSignal()?.portfolio);

  inIpsr = signal(false);

  portfolioAcronym = computed(() => this.dataControlSE.currentResultSignal()?.portfolio);
  isP25 = computed(() => Portfolios[this.portfolioAcronym()] == Portfolios.P25);
  isP22 = computed(() => Portfolios[this.portfolioAcronym()] == Portfolios.P22);
  /**
   * The reporting phase year of the OPEN RESULT, or `null` when it is not reliably known.
   *
   * 🛑 There is deliberately NO fallback to `dataControlSE.reportingCurrentPhase.phaseYear`. That is
   * the OPEN phase of the reporting module (`data-control.service.ts:125`, today 2026) — a different
   * thing from the phase of the result being viewed. Every gate below asks "is THIS result a 2026+
   * result?", so falling back to the open phase answered a different question, and answered it
   * wrongly in the one direction that hurts: `true`, i.e. the NEW form painted over a legacy result.
   * The population makes that the wrong side to fail towards — measured on 2 Sep 2026 in the user's
   * own list, prtest holds 1516 results in the 2025 phase against 353 in 2026.
   *
   * The window is real, not theoretical:
   * 1. `result-detail.component.ts:69` and `current-result.service.ts:26` reset
   *    `currentResultSignal` to `{}` at the start of every load, and `rd-general-information`
   *    (`:127` -> `:200`) and `rd-evidences` (`:222` -> `:239`) release their own
   *    `[appSectionSkeleton]` from their OWN GET, never waiting on `GET_resultById` — so the form is
   *    live and unmasked while the year is still unknown. `rd-evidences.component.ts:198` already
   *    documents that exact window for P2-3262: "the result can land AFTER this section mounts".
   * 2. `current-result.service.ts:65-69`: any non-404 failure of `GET_resultById` leaves the signal
   *    at `{}` PERMANENTLY (only a 404 navigates away), with the form on screen.
   *
   * Precedents in this same family, both deciding the same way:
   * - `step-n4.component.ts:76` removed this very fallback on purpose, for this very reason
   *   ("open phase != viewed package's phase").
   * - `rd-annual-updating.component.ts:120`: "the safe answer to a bad payload is the legacy form,
   *   never the new one".
   *
   * The `typeof === 'number'` guard is part of the same decision: a year arriving as a string is a
   * bad payload, and a bad payload gets the legacy form.
   *
   * ⚠️ Side effect worth keeping: because that plain, non-signal object is no longer read here, the
   * gates below track `currentResultSignal()` and nothing else. No untracked read is left to go
   * stale, so they need no version-signal plumbing.
   */
  private readonly currentResultPhaseYear = computed<number | null>(() => {
    const year = this.dataControlSE.currentResultSignal()?.phase_year;
    return typeof year === 'number' ? year : null;
  });
  /**
   * The open result's reporting phase year, or `null` when it is not reliably known.
   *
   * Exposed for the callers that need the YEAR and not a boolean gate — P2-3292 asks the
   * discontinuation-reason catalogue for one phase generation. 🛑 Read it from here and never from
   * `GET .../get/general-information/result/{id}`, which answers `phase_year: 2025` for a result
   * the screen shows in Reporting 2026 (verified 27 Aug 2026 on 8933 / 8548).
   */
  readonly phaseYear = this.currentResultPhaseYear;

  /** A phase gate is only ever `true` on a reliably known year — unknown means the legacy form. */
  private isPhaseYearAtLeast(threshold: number): boolean {
    const year = this.currentResultPhaseYear();
    return year !== null && year >= threshold;
  }
  /**
   * True when the open result's reporting phase is 2026+ → new Contributors & Partners
   * layout, labels and validations (P2-3036). 2025 and earlier keep the legacy UI.
   * Threshold is centralized in {@link ReportingDesignYear}.
   */
  isContributorsPartners2026 = computed(() => this.isPhaseYearAtLeast(ReportingDesignYear.ContributorsPartnersRedesign));
  /**
   * True when the open result's reporting phase is 2026+ → the Innovation Development form drops the
   * "Demand of anticipated innovation user" section (P2-3263) and the Megatrends question (P2-3264),
   * per epic P2-3243. 2025 and earlier keep both, showing whatever was answered.
   * Threshold is centralized in {@link ReportingDesignYear}.
   */
  isInnovationDevFormReduced2026 = computed(() => this.isPhaseYearAtLeast(ReportingDesignYear.InnovationDevFormReduction));
  /**
   * True when the open result's reporting phase is 2026+ → the Innovation Use 2030 block is titled
   * "2030 Use Projection" and shows the projection tooltip (P2-3295, epic P2-3243). 2025 and earlier
   * keep the legacy long title verbatim and no tooltip.
   * Threshold is centralized in {@link ReportingDesignYear}.
   */
  isInnovationUse2030Projection2026 = computed(() => this.isPhaseYearAtLeast(ReportingDesignYear.InnovationUse2030Projection));
  /**
   * True when the open result's reporting phase is 2026+ → the Innovation Use "Current use"
   * block offers the age-only disaggregation fallback and the system-applied 50/50 split
   * (P2-3537 section 7). 2025 and earlier keep the single combined "Sex and age
   * disaggregation does not apply" tick and nothing else.
   */
  isInnovationUseAgeFallback2026 = computed(() =>
    this.isPhaseYearAtLeast(ReportingDesignYear.InnovationUseAgeDisaggregationFallback)
  );
  /**
   * Tooltip shown next to the "2030 Use Projection" title (P2-3295). Empty for phases <= 2025, which
   * never showed it — `app-field-card` only paints the ⓘ button when it receives a non-empty string.
   * Lives here, not in `fields()`, because `preventFieldRender()` only mirrors label/description/required.
   */
  innovationUse2030ProjectionTooltip = computed(() =>
    this.isInnovationUse2030Projection2026()
      ? "This projection informs CGIAR's investment case and impact modeling. It must be reviewed and, if necessary, revised annually based on current evidence."
      : ''
  );
  /**
   * True when the open result's reporting phase is 2026+ → the Innovation Development "Innovation
   * Developer" field is pre-filled from the Lead contact person and drops its guidance note
   * (P2-3272 Part 4, epic P2-3243). 2025 and earlier keep the empty field and the note verbatim.
   * Threshold is centralized in {@link ReportingDesignYear}.
   */
  isInnovationDeveloperAutoFilled2026 = computed(() => this.isPhaseYearAtLeast(ReportingDesignYear.InnovationDeveloperAutoFill));
  /**
   * True when the open result must NOT be asked for "Innovation reference materials" — the last
   * block of the Innovation Development form (P2-3550, epic P2-3243).
   *
   * Two conditions, both from the ticket's own rule:
   * 1. the reporting phase is 2026+ — the YEAR, never `isP25()`: the P25 portfolio starts in 2025,
   *    so a portfolio gate would also strip the block from phase-2025 results, and
   * 2. the result was NOT created with the 2025 form. `is_replicated` is the only marker the server
   *    sends for that: it is 0 for the first version of a result code and 1 for every roll-over, so
   *    in the 2026 phase "replicated" means "born under an earlier form" (verified in prtest on
   *    2 Sep 2026: result 11033 = 2026 + `is_replicated` 0, result 11034 = 2026 + `is_replicated` 1).
   *
   * ⚠️ Condition 2 is only equivalent to "created with the 2025 form" while 2026 is the newest
   * phase. A result born in 2026 and rolled over to 2027 will also be flagged replicated and would
   * get the block back. Telling those apart needs the phase year of the result's FIRST version,
   * which the server can compute but does not send today.
   * Threshold is centralized in {@link ReportingDesignYear}.
   */
  isInnovationReferenceMaterialsRemoved2026 = computed(
    () =>
      this.isPhaseYearAtLeast(ReportingDesignYear.InnovationReferenceMaterialsRemoval) &&
      !this.dataControlSE.currentResultSignal()?.is_replicated
  );
  /**
   * True when the open result's reporting phase is 2026+ → new Geographic location
   * "location of benefit" wording (P2-3036 AC9) for P25 Innovation results. 2025 keeps the legacy wording.
   * Threshold is centralized in {@link ReportingDesignYear}.
   */
  isGeographicLocation2026 = computed(() => this.isPhaseYearAtLeast(ReportingDesignYear.GeographicLocationRedesign));
  /**
   * True when the open result's reporting phase is 2026+ → reporting-form guidance redesign
   * (P2-3201 / INC-158283): AI assistant notes, "Description of Result" label and the guidance
   * moved from inline grey boxes into ⓘ tooltips. 2025 and earlier keep the legacy presentation.
   * Threshold is centralized in {@link ReportingDesignYear}.
   */
  isReportingFormGuidance2026 = computed(() => this.isPhaseYearAtLeast(ReportingDesignYear.ReportingFormGuidanceRedesign));
  /**
   * True when Lead Contact Person must be filled in: P25 from the 2026 phase on (P2-3225).
   * Unlike the other thresholds here this one also gates on the portfolio, because P22 keeps the
   * field optional regardless of year. Mirrors the server-side green check in
   * `validation_general_information_P25`, so UI and validation agree on the same cut-off.
   * Threshold is centralized in {@link ReportingDesignYear}.
   */
  isLeadContactPersonMandatory2026 = computed(
    () => this.isP25() && this.isPhaseYearAtLeast(ReportingDesignYear.LeadContactPersonMandatory)
  );
  /**
   * True when the open Innovation Package's reporting phase is 2026+ → Step 3 uses the restructured
   * Scaling readiness assessment (P2-3573, epic P2-3243): the new main question and no "Potential
   * situation (12 months later)" columns. 2025 and earlier render Step 3 exactly as they do today.
   *
   * Safe to read from the IPSR screens: `innovation-package-detail.component.html:64` only activates
   * the `<router-outlet>` once `porfolioExists()` is truthy, and both `portfolio` and `phase_year`
   * arrive in the same `GETInnovationPackageDetail` payload (`api.service.ts:126`) — so no step ever
   * mounts before the year is known. Threshold is centralized in {@link ReportingDesignYear}.
   */
  isIpsrScalingReadiness2026 = computed(() => this.isPhaseYearAtLeast(ReportingDesignYear.IpsrScalingReadinessLayout));
  /**
   * True when the open Innovation Package's reporting phase is 2026+ → Step 2 also lists Innovation
   * Use, Policy Change and Capacity Sharing for Development alongside Innovation Development
   * (P2-3572, epic P2-3243). 2025 and earlier keep the Innovation-Development-only table.
   * Threshold is centralized in {@link ReportingDesignYear}.
   */
  isIpsrStepTwoEnablerTypes2026 = computed(() => this.isPhaseYearAtLeast(ReportingDesignYear.IpsrStepTwoEnablerTypes));
  isAnInnovation = computed(
    () => this.dataControlSE.currentResultSignal()?.result_type_id == 2 || this.dataControlSE.currentResultSignal()?.result_type_id == 7
  );
  activeIndicatorsLength = signal<number>(0);
  hasSelectedIndicator = signal<boolean>(false);

  scoresImpactAreaLabel = 'Which component of the Impact Area is this result intended to impact?';

  // Helper para reducir duplicación en campos de Impact Area
  private impactAreaField = (): CustomField => ({
    label: this.scoresImpactAreaLabel,
    hide: this.isP22(),
    required: true
  });

  // Helper para campos tag/score con label dinámico
  private tagScoreField = (topic: string): CustomField => ({
    label: `${topic} ${this.isP25() ? 'tag' : 'score'}`,
    required: true
  });

  fields = computed<Record<string, CustomField>>(() => {
    const fields: Record<string, CustomField> = {
      '[general-info]-title': {
        label: 'Title',
        placeholder: 'Enter text',
        description: `<ul>
            <li>Provide a clear, informative name of the output, for a non-specialist reader and without acronyms.</li>
            <li>Avoid abbreviations or (technical) jargon.</li>
            ${this.isP25() ? '<li>For innovations, varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>' : ''}
          </ul>`
      },
      '[general-info]-description': {
        // P2-3201: renamed to "Description of Result" from the 2026 cycle on; earlier phases keep "Description".
        label: this.isReportingFormGuidance2026() ? 'Description of Result' : 'Description',
        placeholder: 'Enter text',
        required: !this.dataControlSE.isKnowledgeProductSignal(),
        description: `<ul>
    <li>Ensure the description is understandable for a non-specialist reader.</li>
     <li>Avoid acronyms and technical jargon.</li>
    <li>Avoid repetition of the title.</li>
      ${this.isP25() ? '<li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>' : ''}
    </ul>`
      },
      '[general-info]-lead_contact_person': {
        label: 'Lead contact person',
        placeholder: 'Search for a person (min 4 characters)',
        description: `For more precise results, we recommend searching by email or username.
    <br><strong>Examples:</strong> j.smith@cgiar.org; jsmith; JSmith`,
        required: this.isLeadContactPersonMandatory2026()
      },
      '[general-info]-is_krs': {
        label: 'Is this result featured in a Key Result Story for the reporting year?',
        hide: this.isP25()
      },
      //? score 1
      '[general-info]-gender_tag_id': {
        label: this.isP25() ? 'Gender equality, youth and social inclusion tag' : 'Gender equality scoren',
        required: true
      },
      '[general-info]-gender_impact_area_id': this.impactAreaField(),
      //? score 2
      '[general-info]-climate_change_tag_id': {
        label: this.isP25() ? 'Climate adaptation and mitigation tag' : 'Climate change score',
        required: true
      },
      '[general-info]-climate_impact_area_id': this.impactAreaField(),
      //? score 3
      '[general-info]-nutrition_tag_level_id': this.tagScoreField('Nutrition, health and food security'),
      '[general-info]-nutrition_impact_area_id': this.impactAreaField(),
      //? score 4
      '[general-info]-environmental_biodiversity_tag_level_id': this.tagScoreField('Environmental health and biodiversity'),
      '[general-info]-environmental_biodiversity_impact_area_id': this.impactAreaField(),
      //? score 5
      '[general-info]-poverty_tag_level_id': this.tagScoreField('Poverty reduction, livelihoods and jobs'),
      '[general-info]-poverty_impact_area_id': this.impactAreaField(),
      '[geoscope-management]-has_extra_geo_scope': {
        label: 'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?',
        description:
          'This should reflect other geographies where the innovation development, testing and/or use could also contribute to outcomes and impact"',
        required: true,
        hide: this.isP22() || !this.isAnInnovation()
      },
      '[geoscope-management]-extra_geo_scope_id': {
        label: 'What is the geographic scope where there may be potential impact in other geographic areas?',
        hide:
          this.isP22() ||
          (this.dataControlSE.currentResultSignal().result_type_id != 2 && this.dataControlSE.currentResultSignal().result_type_id != 7)
      },
      '[innovation-dev-info]-long_title': {
        label: 'Long title',
        hide: this.isP25()
      },
      '[innovation-dev-info]-short_title': {
        label: this.isP25() ? 'Provide a short name for the innovation' : 'Provide a short title for the innovation',
        placeholder: 'Innovation short name goes here...',
        required: this.isP25(),
        hide: this.isP22() || !this.isAnInnovation(),
        useColon: !this.isP25(),
        description: this.isP22()
          ? `<ul>
            <li>Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale.</li>
            <li>Innovations may be at early stages of readiness (ideation or basic research) or at more mature stages of readiness (delivery and scaling).</li>
            <li>Enter a short name that facilitates clear communication about the innovation.</li>
            <li>Avoid abbreviations or (technical) jargon.</li>
            <li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>
            <li>You do not need to specify the number of new or improved lines/varieties – this can be specified under Innovation Typology.</li>
            <li>If not essential, avoid making reference to specific countries or regions (this is captured through geotagging)</li>
            <li>Avoid the use of CGIAR Center, Program or organization names in the short title</li>
            </ul>`
          : `<ul>
            <li>Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale.</li>
            <li>Innovations may be at early stages of readiness (ideation and upstream research) or at more mature stages of readiness (delivery and scaling).</li>
            <li>Try to develop a short name that facilitates clear communication about the innovation.</li>
            <li>Avoid abbreviations or (technical) jargon.</li>
            <li>If not essential, avoid making reference to specific countries or regions (this is captured through geotagging).</li>
            <li>Avoid the use of CGIAR center, Program or organization names in the short title.</li>
            <li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>
            <li>The specific number of new or improved lines/ varieties can be specified elsewhere.</li>
            </ul>`
      },
      '[innovation-use-form]-has-innovation-link': {
        label: 'Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?',
        hide: this.isP22(),
        required: true
      },
      '[innovation-use-form]-core-innovation': {
        label: 'Current core innovation use in number of users that can be supported by evidence (within the reporting year)',
        hide: this.isP22(),
        required: true,
        description:
          'Depending on the innovation, users may be groups of actors or be organizations. Multiple actors or organizations can be selected.'
      },
      '[innovation-use-form]-has-studies-links': {
        label:
          'Have any studies been conducted to inform the innovation scaling strategy design (e.g. willingness to pay, ex-ante impact study, policy integration, cost-benefit analysis, market sizing, scaling partner network, etc.).?',
        hide: this.isP22(),
        required: true
      },
      '[innovation-use-form]-2030-to-be-determined': {
        label: this.isInnovationUse2030Projection2026()
          ? '2030 Use Projection'
          : 'Specify the targeted innovation use of the core innovation by end of 2030, supported by projections or evidence where available',
        hide: this.isP22(),
        required: true,
        description: `<ul>
          <li>Depending on the innovation, users may be groups of actors or be organizations. Multiple actors or organizations can be selected.</li>
          <li>If the innovation does not target specific groups of actors or people, then please specify the expected innovation use at organizational level or other use.</li>
          <li>The numbers should reflect the expected innovation use by end of 2030. This <a href="https://docs.google.com/document/d/1mkt4bS51CyGmHKfkvuonAiJhkl4n-mLE/" class="open_route" target="_blank">guidance note</a> outlines a practical process for estimating or projecting innovation use figures by 2030.</li>
          <li>Add information for as many as applicable.</li>
          <li>CGIAR follows the United Nations definition of 'youth' as those persons between the ages of 15 and 24 years. If age disaggregation does not apply then please apply a 50/50% rule in dividing women or men across the youth/non-youth category.</li>
          </ul>`
      },
      '[knowledge-product-info]-ost_submitted': {
        label: this.isP25() ? 'Do you have a MELIA study planned in your TOC?' : 'Was it planned in your Initiative proposal?',
        required: true
      },
      '[knowledge-product-info]-ost_melia_select': {
        label: this.isP25()
          ? 'Select the MELIA study from the drop-down (this drop-down is synced with your TOC)'
          : 'Select MELIA from those included in OST Section 6.3',
        placeholder: this.isP25()
          ? 'Select the MELIA study from the drop-down (this drop-down is synced with your TOC)'
          : 'Select MELIA from those included in OST Section 6.3',
        required: true
      }
    };
    return fields;
  });
}
