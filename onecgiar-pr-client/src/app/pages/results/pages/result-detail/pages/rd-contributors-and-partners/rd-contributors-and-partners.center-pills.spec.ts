import { readFileSync } from 'fs';
import { join } from 'path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { RdContributorsAndPartnersComponent } from './rd-contributors-and-partners.component';
import { RdContributorsAndPartnersService } from './rd-contributors-and-partners.service';
import { ContributorsAndPartnersBody } from './models/contributorsAndPartnersBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { InnovationUseResultsService } from '../../../../../../shared/services/global/innovation-use-results.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { ALL_PROJECT_CENTERS } from '../../../../../../shared/utils/project-center-filter.util';

/**
 * P2-3860 — Center pills inside the W1/W2 "Contributing W3 and/or bilateral projects" panel.
 *
 * Renders the REAL markup of that field, cut from `rd-contributors-and-partners.component.html`
 * (from its `<app-pr-multi-select data-testid="cp-field-bilateral_projects"` to the closing tag),
 * inside the REAL `app-pr-multi-select` — so the `[util]` projection, the mousedown/click guards and
 * the options binding are the shipped ones, not a stub. The rest of the section is left out: it
 * needs a dozen catalogues that have nothing to do with this field.
 */
function bilateralProjectsFieldMarkup(): string {
  const html = readFileSync(join(__dirname, 'rd-contributors-and-partners.component.html'), 'utf8').replace(/\r\n/g, '\n');
  const start = html.indexOf('<app-pr-multi-select\n      data-testid="cp-field-bilateral_projects"');
  const end = html.indexOf('</app-pr-multi-select>', start);
  if (start < 0 || end < 0) throw new Error('bilateral projects field not found in the template');
  return html.slice(start, end + '</app-pr-multi-select>'.length);
}

const project = (id: number, orgId: number | null, acronym?: string, name?: string) => ({
  project_id: id,
  project_name: `Project ${id}`,
  fullName: `Project ${id}`,
  organization_id: orgId,
  organization_acronym: acronym ?? null,
  organization_name: name ?? null
});

describe('RdContributorsAndPartnersComponent · P2-3860 Center pills (W1/W2)', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let component: RdContributorsAndPartnersComponent;
  let rdPartnersSE: any;
  let roles: { readOnly: boolean };
  let patch: jest.Mock;

  const catalogue = () => [
    project(1, 30, 'IFPRI', 'International Food Policy Research Institute'),
    project(2, 10, 'CIP', 'International Potato Center'),
    project(3, 30, 'IFPRI', 'International Food Policy Research Institute'),
    project(4, null),
    project(5, 20, 'AfricaRice', 'Africa Rice Center')
  ];

  const host = () => fixture.nativeElement as HTMLElement;
  const pills = () => Array.from(host().querySelectorAll<HTMLButtonElement>('[data-testid="cp-bilateral-projects-center-pills"] button'));
  const pill = (value: number | 'all') => host().querySelector<HTMLButtonElement>(`[data-testid="cp-bilateral-projects-center-pill-${value}"]`);
  // Label span + count span, as a reader would say them; "*" marks the pressed pill.
  const pillSummary = () =>
    pills().map(b => {
      const text = Array.from(b.querySelectorAll('span'))
        .map(s => s.textContent.trim())
        .filter(Boolean)
        .join(' ');
      return `${text}${b.getAttribute('aria-pressed') === 'true' ? ' *' : ''}`;
    });
  const optionIds = () => component.filteredBilateralProjectOptions().map((p: any) => p.project_id);

  afterEach(() => jest.restoreAllMocks());

  beforeEach(async () => {
    roles = { readOnly: false };
    patch = jest.fn().mockReturnValue(of({}));
    rdPartnersSE = {
      partnersBody: new ContributorsAndPartnersBody(),
      clarisaProjectsList: catalogue(),
      tocReferenceCenterInstitutionIds: signal<number[]>([]),
      sectionHydratedFromToc: signal(false),
      tocSelectionTouched: signal(false)
    };
    rdPartnersSE.partnersBody.bilateral_projects = [];

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [HttpClientTestingModule, FormsModule, CustomFieldsModule],
      providers: [
        {
          provide: ApiService,
          useValue: { rolesSE: roles, dataControlSE: { currentResultSectionName: signal(''), currentResult: {} }, resultsSE: { PATCH_ContributorsPartners: patch } }
        },
        { provide: RdContributorsAndPartnersService, useValue: rdPartnersSE },
        { provide: RolesService, useValue: roles },
        { provide: DataControlService, useValue: { currentResult: {}, currentResultSignal: signal({}) } },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: InnovationUseResultsService, useValue: { resultsList: [] } },
        { provide: InstitutionsService, useValue: {} },
        { provide: CentersService, useValue: { centers: signal([]), centersList: [], getData: jest.fn().mockResolvedValue([]) } },
        { provide: ResultLevelService, useValue: {} },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => false, isP25: () => false, fields: () => ({}) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideTemplate(RdContributorsAndPartnersComponent, bilateralProjectsFieldMarkup())
      .compileComponents();

    // The section's load flow (catalogues, GETs) is not under test: Angular reads the hook from the
    // prototype when it compiles the component, so the stub has to live there.
    jest.spyOn(RdContributorsAndPartnersComponent.prototype, 'ngOnInit').mockImplementation(() => undefined);
    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the pills inside the panel under its search box — "All centers" first and pressed, then Centers by acronym with counts', () => {
    const group = host().querySelector('.options .util_container [data-testid="cp-bilateral-projects-center-pills"]');
    expect(group).not.toBeNull();
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Filter projects by Center');
    expect(pillSummary()).toEqual(['All centers (5) *', 'AfricaRice (1)', 'CIP (1)', 'IFPRI (2)']);
    // Acronym on the pill; full name in title / aria-label.
    expect(pill(30).getAttribute('title')).toBe('International Food Policy Research Institute (2 projects)');
    expect(pill(30).getAttribute('aria-label')).toBe('International Food Policy Research Institute (2 projects)');
    // Default "All centers": every project, including the one with no owner Center.
    expect(optionIds()).toEqual([1, 2, 3, 4, 5]);
  });

  it('clicking a Center keeps the panel open, filters to its projects (+ selected union), toggles no option and saves nothing', () => {
    const saved = { project_id: 2, obj_clarisa_project: { id: 2 }, fullName: 'Project 2' };
    rdPartnersSE.partnersBody.bilateral_projects = [saved];
    fixture.detectChanges();
    const trigger = host().querySelector('a.field') as HTMLElement;
    const triggerClicks = jest.fn();
    trigger.addEventListener('click', triggerClicks);

    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    pill(30).dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    pill(30).click();
    fixture.detectChanges();

    expect(triggerClicks).not.toHaveBeenCalled();
    expect(pillSummary()).toEqual(['All centers (5)', 'AfricaRice (1)', 'CIP (1)', 'IFPRI (2) *']);
    // IFPRI's own projects + the already-selected CIP project, catalogue order.
    expect(optionIds()).toEqual([1, 2, 3]);
    expect(rdPartnersSE.partnersBody.bilateral_projects).toEqual([saved]);
    expect(patch).not.toHaveBeenCalled();

    pill('all').click();
    fixture.detectChanges();
    expect(optionIds()).toEqual([1, 2, 3, 4, 5]);
    expect(pillSummary()[0]).toBe('All centers (5) *');
  });

  it('a project with no owner Center is only listed under "All centers"', () => {
    for (const value of [10, 20, 30]) {
      component.setProjectCenterFilter(value);
      expect(optionIds()).not.toContain(4);
    }
    component.setProjectCenterFilter(ALL_PROJECT_CENTERS);
    expect(optionIds()).toContain(4);
  });

  it('a Center that no longer owns a listed project (program reloaded) falls back to "All centers"', () => {
    component.setProjectCenterFilter(30);
    rdPartnersSE.clarisaProjectsList = [project(7, 10, 'CIP', 'International Potato Center')];
    fixture.detectChanges();
    expect(component.projectCenterFilter()).toBe(ALL_PROJECT_CENTERS);
    expect(pillSummary()).toEqual(['All centers (1) *', 'CIP (1)']);
  });

  it('keeps the same options array between change-detection passes (no re-decoration churn)', () => {
    component.setProjectCenterFilter(30);
    expect(component.filteredBilateralProjectOptions()).toBe(component.filteredBilateralProjectOptions());
  });

  it('P2-3838: filtering never touches clarisaProjectsList, the full list the owner-Center lock reads', () => {
    const before = rdPartnersSE.clarisaProjectsList;
    pill(20).click();
    fixture.detectChanges();
    expect(rdPartnersSE.clarisaProjectsList).toBe(before);
    expect(rdPartnersSE.clarisaProjectsList.map((p: any) => p.project_id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('hidden in read-only', () => {
    roles.readOnly = true;
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="cp-bilateral-projects-center-pills"]')).toBeNull();
  });

  it('hidden when no listed project has an owner Center', () => {
    rdPartnersSE.clarisaProjectsList = [project(8, null)];
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="cp-bilateral-projects-center-pills"]')).toBeNull();
  });
});
