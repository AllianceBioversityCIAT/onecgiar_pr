import { Component, computed, effect, inject, signal } from '@angular/core';
import { InnovationDevInfoBody } from './model/innovationDevInfoBody';
import { InnovationControlListService } from '../../../../../../../shared/services/global/innovation-control-list.service';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InnovationDevelopmentQuestions } from './model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from './services/innovation-dev-info-utils.service';
import { InnovationDevelopmentLinks } from './model/InnovationDevelopmentLinks.model';
import { EvidencesBody } from '../../../../result-detail/pages/rd-evidences/model/evidencesBody.model';
import { FieldsManagerService } from '../../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';
import { SharePointUploadService } from '../../../../../../../shared/services/sharepoint-upload/sharepoint-upload.service';

/**
 * Guidance printed under "Innovation Developer" up to the 2025 phase. Kept verbatim — P2-3272 Part 4
 * drops it from 2026 on, and epic P2-3243 requires earlier phases to render exactly as they did.
 * `app-field-card` paints no description block at all when it receives an empty string.
 */
const LEGACY_INNOVATION_DEVELOPER_DESCRIPTION = `Provide the full name(s), email address and organizational affiliation(s) of the innovation developer/ contact person
        Innovation developer will be first author of the Innovation Profile document and the prime contact for the innovation.<br>
        Please provide information such as first name, family name, email address and organizational affiliations.`;

@Component({
  selector: 'app-innovation-dev-info',
  templateUrl: './innovation-dev-info.component.html',
  styleUrls: ['./innovation-dev-info.component.scss'],
  standalone: false
})
export class InnovationDevInfoComponent {
  innovationDevInfoBody = new InnovationDevInfoBody();
  range = 5;
  savingSection = false;
  innovationDevelopmentQuestions: InnovationDevelopmentQuestions = new InnovationDevelopmentQuestions();
  innovationDevelopmentLinks: InnovationDevelopmentLinks = new InnovationDevelopmentLinks();

  evidencesBody: EvidencesBody = new EvidencesBody();

  /**
   * P2-3220 — the SharePoint upload sequence is NOT owned here any more. This section used to keep
   * its own copy (its own session loop, its own progress interval, its own `sp_*` assignments) and
   * it was the only one of the three that called `POST_createUploadSessionP25`, so "every upload
   * goes through the shared flow" was not something the code could enforce.
   */
  private readonly sharePointUploadSE = inject(SharePointUploadService);

  /**
   * Drives `[appSectionSkeleton]`. TRUE from construction and NOT from "a request is in flight":
   * this section loads from an `effect()` gated on `currentResultSignal()?.portfolio`, so between
   * first paint and the GET there is no request at all and the empty body would paint as a
   * mandatory-but-empty form. Released on `next` AND `error`.
   */
  readonly sectionLoading = signal(true);

  constructor(
    private readonly api: ApiService,
    public innovationControlListSE: InnovationControlListService,
    private readonly innovationDevInfoUtilsSE: InnovationDevInfoUtilsService,
    public fieldsManagerSE: FieldsManagerService,
    public dataControlSE: DataControlService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Innovation Development information');
  }

  OnChangePortfolio = effect(() => {
    if (this.dataControlSE.currentResultSignal()?.portfolio !== undefined) {
      this.fieldsManagerSE.isP25() ? this.getSectionInformationp25() : this.getSectionInformation();
    }
  });

  /**
   * P2-3272 Part 4 — from the 2026 phase on the field is pre-filled from the Lead contact person,
   * so its long guidance note is dropped. Phases <= 2025 keep the note verbatim.
   */
  innovationDeveloperDescription = computed(() =>
    this.fieldsManagerSE.isInnovationDeveloperAutoFilled2026() ? '' : LEGACY_INNOVATION_DEVELOPER_DESCRIPTION
  );

  collaboratorsDescription = computed(() => {
    return `Provide the full name(s), email address and organizational affiliation(s)  of other CGIAR and/or partner colleagues that contribute to this innovation
        Names of key contributors will feature as co-authors on the Innovation Profile document in the same order as provided below. <br>
        <br>
        <b>Standard format for entering collaborators:</b> <br>
        Please enter each collaborator using the following format: Collaborator Name (email address).
        If you register more than one collaborator, separate them using a semicolon (;).<br><br>
        <b>Example:</b> Michael Thompson (m.thompson@innovationlab.org); Aisha Rahman (a.rahman@globalresearch.net)`;
  });

  getSectionInformationp25(): void {
    this.api.resultsSE.GET_innovationDevP25().subscribe({
      next: ({ response }) => {
        this.innovationDevInfoBody = response;
        this.convertOrganizations(response?.innovatonUse?.organization);
        this.normalizeInnovationDevBooleans();
        this.applyInnovationDeveloperAutoFill();
        this.savingSection = false;
        this.sectionLoading.set(false);
      },
      error: err => {
        console.error(err);
        this.savingSection = false;
        this.sectionLoading.set(false);
      }
    });
    this.api.resultsSE.GET_questionsInnovationDevelopmentP25().subscribe(({ response }) => {
      this.innovationDevelopmentQuestions = response;
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q3);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q4);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.innovation_team_diversity);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q3);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q4);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.megatrends);
    });

    this.getEvidenceDemandP25();
  }

  GET_questionsInnovationDevelopment() {
    this.api.resultsSE.GET_questionsInnovationDevelopment().subscribe(({ response }) => {
      this.innovationDevelopmentQuestions = response;
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.innovation_team_diversity);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q3);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.megatrends);
    });
  }

  getSectionInformation() {
    this.savingSection = true;
    this.GET_questionsInnovationDevelopment();
    this.api.resultsSE.GET_innovationDev().subscribe({
      next: ({ response }) => {
        this.convertOrganizations(response?.innovatonUse?.organization);
        this.innovationDevInfoBody = response;
        this.normalizeInnovationDevBooleans();
        this.applyInnovationDeveloperAutoFill();
        this.savingSection = false;
        this.sectionLoading.set(false);
      },
      error: err => {
        console.error(err);
        this.savingSection = false;
        this.sectionLoading.set(false);
      }
    });
  }

  private getEvidenceDemandP25() {
    this.api.resultsSE.GET_evidenceDemandP25().subscribe(({ response }) => {
      this.evidencesBody = response ?? new EvidencesBody();
    });
  }

  convertOrganizations(organizations) {
    organizations.forEach((item: any) => {
      if (item.parent_institution_type_id) {
        item.institution_sub_type_id = item?.institution_types_id;
        item.institution_types_id = item?.parent_institution_type_id;
      }
    });
  }

  /**
   * P2-3272 Part 4 — pre-fill "Innovation Developer" with the Lead contact person captured in
   * General Information, from the 2026 phase on.
   *
   * Only when the field is still empty: overwriting would silently discard a name the reporter
   * typed themselves, and the requirement asks for a starting point, not a locked value. The field
   * stays editable, and it is not part of the green check (`validation_innovation_dev_P25` does not
   * read `innovation_developers`), so pre-filling can never block a submission.
   *
   * ⚠️ The value is only persisted when the section is saved. A reporter who clears the field and
   * reloads without saving sees it pre-filled again — that is the cost of "pre-fill when empty",
   * and the alternative (a stored "was cleared on purpose" flag) needs a column nobody asked for.
   */
  private applyInnovationDeveloperAutoFill(): void {
    if (!this.fieldsManagerSE.isInnovationDeveloperAutoFilled2026()) return;
    if (this.innovationDevInfoBody?.innovation_developers?.trim()) return;
    const leadContactPerson = `${this.dataControlSE.currentResultSignal()?.lead_contact_person ?? ''}`.trim();
    if (!leadContactPerson) return;
    this.innovationDevInfoBody.innovation_developers = leadContactPerson;
  }

  private normalizeInnovationDevBooleans(): void {
    this.innovationDevInfoBody.innovation_user_to_be_determined = Boolean(
      this.innovationDevInfoBody.innovation_user_to_be_determined,
    );
    this.innovationDevInfoBody.is_new_variety =
      this.innovationDevInfoBody.is_new_variety == null
        ? null
        : Boolean(this.innovationDevInfoBody.is_new_variety);
    if (this.innovationDevInfoBody.innovation_nature_id != null) {
      this.innovationDevInfoBody.innovation_nature_id = Number(
        this.innovationDevInfoBody.innovation_nature_id,
      );
    }
  }

  convertOrganizationsTosave() {
    this.innovationDevInfoBody.innovatonUse.organization.forEach((item: any) => {
      if (item.institution_sub_type_id) {
        item.institution_types_id = item.institution_sub_type_id;
      }
    });
  }

  /**
   * P2-3218 — a save failure has to reach the user, not just the console.
   *
   * Same shape as the fix applied to the other two evidence surfaces in e014ee987, so the three
   * upload points now react to failure identically instead of three different ways.
   */
  private showSaveError(title: string, description: string): void {
    this.api.alertsFe.show({
      id: 'innovation-dev-save-failed',
      title,
      description,
      status: 'error'
    });
  }

  /**
   * P2-3550 AC4 — "Stored reference materials are not deleted, cleared or migrated".
   *
   * Hiding the block is not enough, and doing only that would DELETE data. The server's
   * `InnovationDevService.saveEvidence` returns early **only** when the array is `null`/`undefined`
   * (`onecgiar-pr-server/src/api/results/summary/innovation_dev.service.ts:99-101`); with any other
   * value it walks every stored evidence of type 4 and sets `is_active = 0` on the ones whose link
   * is not in the payload (`:110-125`). Since `InnovationDevInfoBody` seeds `reference_materials`
   * with `[{ link: '' }]`, a hidden-but-still-sent field would wipe the references of every 2026
   * result on the next save (real case in prtest: result 11082, phase 2026, `is_replicated` 0,
   * evidence 12818 = `link.com`).
   *
   * So the key is **omitted**, never sent empty — the same undefined-vs-value contract as the
   * MELIA-study fix. Destructuring (instead of `delete`) is what guarantees the key is absent from
   * the JSON rather than present with `undefined`.
   */
  private buildSectionPayload(): Record<string, any> {
    const { reference_materials, ...rest } = { ...this.innovationDevInfoBody, ...this.innovationDevelopmentQuestions } as Record<string, any>;
    return this.fieldsManagerSE.isInnovationReferenceMaterialsRemoved2026() ? rest : { ...rest, reference_materials };
  }

  async onSaveSection() {
    this.savingSection = true;
    this.convertOrganizationsTosave();
    if (this.innovationDevInfoBody.innovation_nature_id != 12) {
      this.innovationDevInfoBody.number_of_varieties = null;
      this.innovationDevInfoBody.is_new_variety = null;
    }
    if (this.fieldsManagerSE.isP25()) {
      const resultId = (this.api.dataControlSE?.currentResult as any)?.result_id ?? (this.api.dataControlSE?.currentResult as any)?.id;
      (this.evidencesBody as any).result_id = resultId;

      // P2-3218: this method had three failure paths and all three were silent — a console.error,
      // the spinner off, and nothing on screen. The user pressed Save, saw the spinner stop, and
      // walked away believing the section was stored. The same defect was fixed for the other two
      // evidence surfaces in e014ee987 (P2-3220); this one was left out of that pass.
      //
      // P2-3220: the failure is still SHOWN, and now by file name, but it no longer abandons the
      // save. The file is lost either way — the 2026 endpoint parses only `jsonData` and drops the
      // multipart `files` (`innovation_dev.controller.ts:45-57`), so the user has to re-attach it —
      // and throwing away everything else they typed does not bring it back. Same contract as the
      // other two evidence surfaces: save the section, and name the files that did not make it.
      const failedUploads = await this.uploadPendingFiles();
      if (failedUploads.length) {
        this.showSaveError(
          `${failedUploads.length} file(s) could not be stored: ${failedUploads.join(', ')}`,
          'The rest of the section is being saved, but those files are not in SharePoint. Please re-attach them and save again.'
        );
      }

      this.api.resultsSE.POST_createEvidenceDemandP25(this.evidencesBody).subscribe({
        next: () => {
          this.api.resultsSE.PATCH_innovationDevP25(this.buildSectionPayload()).subscribe({
            next: () => {
              this.getSectionInformationp25();
              this.savingSection = false;
            },
            error: err => {
              console.error('[innovation-dev-info] saving the section failed', err);
              // The files reached SharePoint and the evidence record was written; only the
              // section's own fields failed. Saying so keeps the user from re-attaching files
              // that are already stored.
              this.showSaveError(
                'This section was not saved',
                'Your evidence was stored, but the rest of the section could not be saved. Please try saving again.'
              );
              this.savingSection = false;
            }
          });
        },
        error: err => {
          console.error('[innovation-dev-info] registering the evidence failed', err);
          this.showSaveError(
            'Your evidence was not saved',
            'The files were uploaded but could not be registered against this result, so this section was not saved. Please try saving again.'
          );
          this.savingSection = false;
        }
      });
    } else {
      this.api.resultsSE.PATCH_innovationDev(this.buildSectionPayload()).subscribe({
        next: ({ response }) => {
          this.getSectionInformation();
          this.savingSection = false;
        },
        error: err => {
          console.error(err);
          this.savingSection = false;
        }
      });
    }
  }

  /**
   * P2-3220 — delegates to the single shared upload flow and returns the names of the files that
   * did not reach SharePoint (empty when all went up). Never throws.
   *
   * Why each option is what it is:
   * - `flow: 'innovation-development'` → the v2 `evidence_demand/createUploadSession` door, the one
   *   this section has always used. The caller no longer names an endpoint.
   * - `skipAlreadyUploaded: true` → reproduces the old `if (evidence.file && !evidence.link)`.
   * - `trackProgress: true` → MEASURED, not assumed: `components/user-evidence/` renders both the
   *   percentage and the animated bar (`user-evidence.component.html:68-77`).
   * - `fallbackToLocalName: true` → the old copy did `response?.name || evidence.file.name`, and
   *   that fallback is load-bearing HERE: the same template gates the whole uploaded-file row on
   *   `sp_file_name`, so a nameless response would drop the just-attached file back to the
   *   drag-and-drop box. The two surfaces migrated before this one never had the fallback, hence
   *   an explicit option rather than a new default for all three.
   */
  private async uploadPendingFiles(): Promise<string[]> {
    const resultId = (this.api.dataControlSE?.currentResult as any)?.result_id ?? (this.api.dataControlSE?.currentResult as any)?.id;

    return this.sharePointUploadSE.uploadPending(this.evidencesBody.evidences, {
      resultId,
      flow: 'innovation-development',
      skipAlreadyUploaded: true,
      trackProgress: true,
      fallbackToLocalName: true,
      logLabel: 'innovation-dev-info'
    });
  }

  pdfOptions = [
    { name: 'Yes', value: true },
    { name: 'No, not necessary at this stage', value: false }
  ];

  pdfDescription() {
    return `Examples of IPSR Innovation Profiles can be found  <a class="open_route" target="_blank" href="https://cgspace.cgiar.org/handle/10568/121923">here</a>.`;
  }

  acknowledgementDescription() {
    return `Are there any specific investors or donors – other than the <a class="open_route" target="_blank" href="https://www.cgiar.org/funders/">CGIAR Fund Donors</a> – who provide core/pooled funding – that you wish to acknowledge for their critical contribution to the continued development, testing, and scaling of this innovation? <br> - Please separate donor/investor names by a semicolon. <br> - Donors/investors will be included in the acknowledgment section in the Innovation Profile.`;
  }

  alertInfoText() {
    return `Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale. Innovations may be at early stages of readiness (ideation or basic research) or at more mature stages of readiness (delivery and scaling)<br><br>The specific number of new or improved lines/ varieties can be specified under Innovation Typology.`;
  }

  alertInfoText2() {
    return `Please make sure you provide evidence/documentation that support the current innovation readiness level.<br>
    * Evidence are inputted in the "Evidence" section <a class="open_route" target="_blank" href="/result/result-detail/${this.api.resultsSE?.currentResultCode}/evidences?phase=${this.api.resultsSE?.currentResultPhase}">(click here to go there)</a><br>
    <br><br>
    Documentation may include idea-notes, concept-notes, technical report, pilot testing report, experimental data paper, newsletter, etc. It may be project reports, scientific publications, book chapters, communication materials that provide evidence of the current development/ maturity stage of the innovation.
    <br><br>
    Examples of evidence documentation for different CGIAR innovations and readiness levels can be found <a target="_blank" href="https://drive.google.com/file/d/1rWGC0VfxazlzdZ1htcfBSw1jO7GmVQbq/view" class='open_route alert-event'>here</a>`;
  }

  shortTitleDescription() {
    return `<ul>
    <li>Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale.</li>
    <li>Innovations may be at early stages of readiness (ideation or basic research) or at more mature stages of readiness (delivery and scaling).</li>
    <li>Enter a short name that facilitates clear communication about the innovation.</li>
    <li>Avoid abbreviations or (technical) jargon.</li>
    <li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>
    <li>You do not need to specify the number of new or improved lines/varieties – this can be specified under Innovation Typology.</li>
    <li>If not essential, avoid making reference to specific countries or regions (this is captured through geotagging)</li>
    <li>Avoid the use of CGIAR Center, Initiative or organization names in the short title</li>
    </ul>`;
  }

  readiness_of_this_innovation_description() {
    return `<ul>
    <li>In case the innovation readiness level differs across countries or regions, we advise to assign the highest current innovation readiness level that can be supported by the evidence provided.</li>
    <li>Be realistic in assessing the readiness level of the innovation and keep in mind that the claimed readiness level needs to be supported by evidence documentation.</li>
    <li>The innovation readiness level will be quality assessed.</li>
    <li><strong>YOUR READINESS LEVEL IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">INNOVATION READINESS CALCULATOR</a></strong></li>
    </ul>`;
  }

  hasReadinessLevelDiminished() {
    const currentLevel = this.innovationControlListSE?.readinessLevelsList.find(
      irl => irl.id === this.innovationDevInfoBody?.innovation_readiness_level_id
    );
    const oldLevel = this.innovationControlListSE?.readinessLevelsList.find(irl => irl.id === this.innovationDevInfoBody?.previous_irl);

    return Number(currentLevel?.level) < Number(oldLevel?.level);
  }

  alertDiminishedReadinessLevel() {
    return `It appears that the readiness level has decreased since the previous report. Please provide a justification in the text box below.`;
  }

  // Métodos para manejar evidencias
  addEvidence() {
    this.evidencesBody.evidences.push({ is_sharepoint: false } as any);
  }

  deleteEvidence(index: number) {
    this.evidencesBody.evidences.splice(index, 1);
  }

  getReadinessLevelIndex(): number {
    if (!this.innovationDevInfoBody.innovation_readiness_level_id || !this.innovationControlListSE.readinessLevelsList) {
      return -1;
    }

    const selectedId = this.innovationDevInfoBody.innovation_readiness_level_id;
    const index = this.innovationControlListSE.readinessLevelsList.findIndex(level => level.id === selectedId);
    return index >= 0 ? index : -1;
  }

  /**
   * The catalogue's numeric `level` (0-9) for the currently selected readiness level, or `null`
   * when nothing is selected / the catalogue has not loaded yet.
   *
   * P2-3265 / P2-3359: read the catalogue row's `level` field, never the row `id` (auto-increment,
   * unrelated to the level number) nor its array position. `getReadinessLevelIndex()` above happens
   * to line up with `level` only because CLARISA currently returns the rows pre-sorted 0..9 with no
   * gaps — that is an accident of today's data, not a guarantee.
   */
  private getSelectedReadinessLevelValue(): number | null {
    const selectedId = this.innovationDevInfoBody?.innovation_readiness_level_id;
    if (selectedId === null || selectedId === undefined || !this.innovationControlListSE?.readinessLevelsList) {
      return null;
    }
    const selected = this.innovationControlListSE.readinessLevelsList.find((level: any) => level.id === selectedId);
    if (!selected) {
      return null;
    }
    const levelValue = Number(selected.level);
    return Number.isNaN(levelValue) ? null : levelValue;
  }

  /**
   * P2-3265 (epic P2-3243): whether the "Have any studies been conducted to inform the innovation
   * scaling strategy design..." question (and its follow-up studies-link list) should render.
   *
   * Ticket's own Conditional Logic table: "< 6: Not applicable (question was not shown at these
   * levels)" + "= 6 [confirmed >= 6 by the PO, Ángel Jarrín, Jira P2-3265, 26-Aug-2026 16:14]:
   * Remove — question must no longer appear". The union of both rows covers every level (0-9): the
   * question is dropped entirely for the 2026 phase onward, regardless of the selected readiness
   * level — there is no level at which it should newly appear. (An earlier pass of this gate showed
   * it for levels 1-5, misreading a follow-up paraphrase as reversing the "< 6: not applicable" row;
   * corrected 26-Aug-2026 after re-reading the ticket's literal table against this same file's
   * pre-existing `>= 6` condition, which the table's "< 6" row was describing all along.)
   *
   * Phases up to and including 2025 must keep rendering exactly as before this change (Ángel Jarrín,
   * Jira P2-3243 epic note, 23-Aug-2026): visible only from level 6 up. Gated on the reporting PHASE
   * YEAR via `isInnovationDevFormReduced2026()` (already 2026-thresholded for this same epic), never
   * on `isP25()`/portfolio — prtest holds 2025-phase results inside the P25 portfolio.
   */
  showScalingStudiesQuestion(): boolean {
    if (this.fieldsManagerSE.isInnovationDevFormReduced2026()) {
      return false;
    }
    const levelValue = this.getSelectedReadinessLevelValue();
    if (levelValue === null) {
      return false;
    }
    return levelValue >= 6;
  }
}
