import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralProjectSelectorComponent } from './bilateral-project-selector.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { signal } from '@angular/core';

describe('BilateralProjectSelectorComponent', () => {
  let component: BilateralProjectSelectorComponent;
  let fixture: ComponentFixture<BilateralProjectSelectorComponent>;
  let creationService: any;
  let ctxService: any;

  beforeEach(async () => {
    creationService = {
      projects: signal([]),
      selectedProject: signal(null),
      isLoadingProjects: signal(false),
      getProjects: jest.fn(),
      selectProject: jest.fn(),
      setLeadProject: jest.fn(),
    };

    ctxService = {
      centerId: signal('CENTER-01'),
      centerInstitutionId: signal(49),
      centerAcronym: signal('C01'),
      centerName: signal('Center One'),
    };

    await TestBed.configureTestingModule({
      imports: [BilateralProjectSelectorComponent],
      providers: [
        { provide: BilateralCreationService, useValue: creationService },
        { provide: BilateralContextService, useValue: ctxService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralProjectSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('asks for the projects of the current centre on init', () => {
    expect(creationService.getProjects).toHaveBeenCalledWith(49);
  });

  // ⚠️ Regression lock. The endpoint keys off the numeric CLARISA institution id. Passing the
  // centre CODE returns 200 with `{ projects: [] }` — no error anywhere, the dropdown just renders
  // empty, and with the Reporting Project field being mandatory NO bilateral result can be created
  // at all. Verified on prtest: `centerId=CIP` → [], `centerId=49` → 1 project.
  it('never passes the centre code — that silently returns an empty list', () => {
    expect(creationService.getProjects).not.toHaveBeenCalledWith('CENTER-01');
    expect(typeof creationService.getProjects.mock.calls[0][0]).toBe('number');
  });

  it('does not ask for projects until the institution id is known', () => {
    creationService.getProjects.mockClear();
    ctxService.centerInstitutionId.set(null);
    fixture.detectChanges();
    expect(creationService.getProjects).not.toHaveBeenCalled();
  });

  it('should emit on project select', () => {
    const emitSpy = jest.spyOn(component.projectSelected, 'emit');
    const project = { id: 1, shortName: 'P1', fullName: 'Project 1', summary: null, description: null, leadCenter: null, sciencePrograms: [] };
    creationService.projects.set([project]);
    component.selectProject(project);
    expect(creationService.selectProject).toHaveBeenCalledWith(project);
    expect(emitSpy).toHaveBeenCalledWith(project);
  });
  /**
   * P2-3518 — the same picker is embedded in the Section 0 card of an existing result, where the
   * card already renders the label and the summary/description block and where the Science Program
   * must NOT be cleared.
   */
  describe('inline variant (P2-3518)', () => {
    const project = { id: 77, shortName: 'NEWPROJ', fullName: 'New project', summary: 'S', description: 'D', leadCenter: null, sciencePrograms: [] };

    beforeEach(() => {
      fixture.componentRef.setInput('variant', 'inline');
      creationService.projects.set([project]);
      fixture.detectChanges();
    });

    it('drops the label and the summary/description block the host card already renders', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.bps-label')).toBeNull();
      expect(el.querySelector('.bps-project-info')).toBeNull();
      // The field itself is the whole point of the variant — it must still be there.
      expect(el.querySelector('.bps-field')).not.toBeNull();
    });

    // ⚠️ `selectProject()` clears `selectedPrimarySp` / `selectedSecondarySps`. On an existing
    // result that would blank the Science Program it already reports against, and what a project
    // change should do to the Science Program is an open requirement question.
    it('re-points the lead project instead of running the wizard selection', () => {
      const emitSpy = jest.spyOn(component.projectSelected, 'emit');

      component.selectProject(project as any);

      expect(creationService.setLeadProject).toHaveBeenCalledWith(project);
      expect(creationService.selectProject).not.toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(project);
    });

    it('keeps the label and the info block in the default wizard variant', () => {
      fixture.componentRef.setInput('variant', 'wizard');
      creationService.selectedProject.set(project);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.bps-label')).not.toBeNull();
      expect(el.querySelector('.bps-project-info')).not.toBeNull();
    });
  });
});
